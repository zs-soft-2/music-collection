/**
 * Kérés elbírálása: mezőnként, indoklással.
 *
 * A gyűjtő nem ír a katalógusba — amit beküld, az egy kérés, és az admin
 * mezőnként dönt róla. Az elfogadott mezők ebben a függvényben, egyetlen
 * tranzakcióban kerülnek a katalógusba; mellettük megszületik a válasz
 * (`entity-response`), ami a gyűjtőnek szól: mi ment át, mi nem, és miért
 * nem. Az elutasítás indoklás nélkül nem megy át — nem a felületen, hanem
 * itt: egy indokolatlan elutasítás nem válasz.
 *
 * Amit a katalógusba írunk, azt a beküldött állapotból (`after`) vesszük, nem
 * a kérés `changes` listájából: a listát is a kliens írta, a séma
 * (`request-schema.ts`) viszont a miénk.
 */

import { DocumentReference, Firestore } from 'firebase-admin/firestore';

import { searchParameters, stamp, touchCatalog } from './catalog-sync';
import {
	EntitySchema,
	RequestDecisionError,
	schemaOf,
	toCatalogValue,
} from './request-schema';

const REQUEST_COLLECTION = 'entity-request';
const RESPONSE_COLLECTION = 'entity-response';
/** A katalógus közös tulajdonosa (libs/common/api GLOBAL_OWNER_ID). */
const GLOBAL_OWNER_ID = 'GLOBAL';

type VerdictKind = 'accepted' | 'rejected';

interface VerdictInput {
	field: string;
	kind: VerdictKind;
	reason?: string | null;
}

export interface DecideRequestInput {
	requestId: string;
	verdicts: VerdictInput[];
	adminNote?: string | null;
}

export interface DecideRequestResult {
	requestId: string;
	responseUid: string;
	status: 'approved' | 'partially-approved' | 'rejected';
	/** A katalógus dokumentuma, ha a döntés írt egyet. */
	appliedPath: string | null;
	appliedFields: string[];
}

interface RequestChangeDocument {
	field: string;
	before: unknown;
	after: unknown;
}

interface RequestDocument {
	userId: string;
	operation: string;
	target: {
		featureKey: string;
		path: string | null;
		parentPath: string | null;
	};
	before: Record<string, unknown> | null;
	after: Record<string, unknown>;
	changes: RequestChangeDocument[];
	status: string;
}

/** Mély egyenlőség, minden ürességet egynek olvasva (a kliens diffjével egyezően). */
export function isSameValue(one: unknown, other: unknown): boolean {
	const empty = (value: unknown) =>
		value === null ||
		value === undefined ||
		value === '' ||
		(Array.isArray(value) && value.length === 0);

	if (empty(one) || empty(other)) {
		return empty(one) && empty(other);
	}
	if (Array.isArray(one) || Array.isArray(other)) {
		return (
			Array.isArray(one) &&
			Array.isArray(other) &&
			one.length === other.length &&
			one.every((item, index) => isSameValue(item, other[index]))
		);
	}
	if (
		typeof one === 'object' &&
		typeof other === 'object' &&
		one !== null &&
		other !== null
	) {
		const fields = new Set([
			...Object.keys(one as Record<string, unknown>),
			...Object.keys(other as Record<string, unknown>),
		]);

		return [...fields].every((field) =>
			isSameValue(
				(one as Record<string, unknown>)[field],
				(other as Record<string, unknown>)[field]
			)
		);
	}

	return one === other;
}

function requirePending(data: unknown): RequestDocument {
	const request = data as RequestDocument | undefined;

	if (!request) {
		throw new RequestDecisionError('Nincs ilyen kérés.', 'not-found');
	}
	if (request.status !== 'pending') {
		throw new RequestDecisionError(
			'A kérést már elbírálták.',
			'failed-precondition'
		);
	}

	return request;
}

/**
 * A döntés mezőnként, a kérés mezőire. Egy mező sem maradhat válasz nélkül, és
 * amit az admin elutasít, azt meg kell indokolnia — a gyűjtő ezt olvassa
 * majd, és ebből tudja, mivel jöhet vissza.
 */
function requireVerdicts(
	request: RequestDocument,
	input: DecideRequestInput
): Map<string, { kind: VerdictKind; reason: string | null }> {
	const verdicts = Array.isArray(input.verdicts) ? input.verdicts : [];
	const decided = new Map<
		string,
		{ kind: VerdictKind; reason: string | null }
	>();

	for (const verdict of verdicts) {
		if (typeof verdict?.field !== 'string') {
			throw new RequestDecisionError('Mező nélküli döntés.');
		}
		if (verdict.kind !== 'accepted' && verdict.kind !== 'rejected') {
			throw new RequestDecisionError(
				`Ismeretlen döntés a mezőn: ${verdict.field}.`
			);
		}

		const reason =
			typeof verdict.reason === 'string' ? verdict.reason.trim() : '';

		if (verdict.kind === 'rejected' && !reason) {
			throw new RequestDecisionError(
				`Az elutasítást meg kell indokolni: ${verdict.field}.`
			);
		}
		if (decided.has(verdict.field)) {
			throw new RequestDecisionError(
				`Két döntés ugyanarra a mezőre: ${verdict.field}.`
			);
		}

		decided.set(verdict.field, {
			kind: verdict.kind,
			reason: reason || null,
		});
	}

	const fields = (request.changes ?? []).map((change) => change.field);

	for (const field of fields) {
		if (!decided.has(field)) {
			throw new RequestDecisionError(
				`Ezt a mezőt nem döntötte el senki: ${field}.`
			);
		}
	}
	if (decided.size !== fields.length) {
		throw new RequestDecisionError(
			'A döntés olyan mezőről szól, ami nincs a kérésben.'
		);
	}

	return decided;
}

/**
 * A katalógus dokumentuma, amire a kérés szól. Új entitásnál a hely a séma és
 * a kérés szülője alapján áll össze; a szülő csak az lehet, ami alá az
 * entitás egyáltalán tartozhat.
 */
function targetReference(
	database: Firestore,
	request: RequestDocument,
	schema: EntitySchema
): DocumentReference {
	if (request.operation === 'update') {
		const path = request.target?.path;

		if (typeof path !== 'string' || !path) {
			throw new RequestDecisionError(
				'A módosítási kérés nem mondja meg, melyik dokumentumról szól.',
				'failed-precondition'
			);
		}

		return database.doc(path);
	}
	if (request.operation !== 'create') {
		throw new RequestDecisionError('Ismeretlen kérés-művelet.');
	}

	const parentPath = request.target?.parentPath ?? null;

	if (!schema.parentCollections.length) {
		if (parentPath) {
			throw new RequestDecisionError(
				'Ez az entitás a katalógus gyökerében él, nincs szülője.',
				'failed-precondition'
			);
		}

		return database.collection(schema.collection).doc();
	}

	// A szülő lánca a sémáé: az albumé `artist/{id}`, a kiadásé
	// `artist/{id}/album/{id}`. A kérésből jövő útvonalra máshogy nem lehet
	// ráengedni az írást — az bármelyik dokumentumra mutathatna.
	const pattern = new RegExp(
		`^${schema.parentCollections
			.map((collection) => `${collection}/[A-Za-z0-9_-]{1,120}`)
			.join('/')}$`
	);

	if (typeof parentPath !== 'string' || !pattern.test(parentPath)) {
		throw new RequestDecisionError(
			'A kérés szülője nem az, ami alá ez az entitás tartozhat.',
			'failed-precondition'
		);
	}

	return database.doc(parentPath).collection(schema.collection).doc();
}

/**
 * Az elbírálás. A katalógusba egyedül ez az út vezet a gyűjtő felől, ezért
 * minden ellenőrzés — a kérés állapota, a mezőnkénti döntés, a séma és a
 * közben megváltozott katalógus — a tranzakción belül dől el.
 */
export async function decideRequest(
	database: Firestore,
	input: DecideRequestInput,
	{ adminUid }: { adminUid: string }
): Promise<DecideRequestResult> {
	const requestReference = database
		.collection(REQUEST_COLLECTION)
		.doc(input.requestId);
	const responseReference = database.collection(RESPONSE_COLLECTION).doc();

	return database.runTransaction(async (transaction) => {
		const snapshot = await transaction.get(requestReference);
		const request = requirePending(snapshot.data());
		const schema = schemaOf(request.target?.featureKey);
		const decided = requireVerdicts(request, input);
		const accepted = (request.changes ?? [])
			.map((change) => change.field)
			.filter((field) => decided.get(field)?.kind === 'accepted');
		const reference = targetReference(database, request, schema);
		const existing = accepted.length
			? await transaction.get(reference)
			: null;

		if (request.operation === 'update' && existing && !existing.exists) {
			throw new RequestDecisionError(
				'A kérésben szereplő dokumentum már nincs meg a katalógusban.',
				'not-found'
			);
		}

		const written: Record<string, unknown> = {};

		for (const field of accepted) {
			const change = request.changes.find((held) => held.field === field);

			// Amit az admin lát, az a kérés `before`-ja. Ha a katalógus azóta
			// mást mond, a döntés nem arra született: inkább elszáll, mint
			// hogy átírjon egy választ, amit senki nem látott.
			if (
				request.operation === 'update' &&
				existing &&
				!isSameValue(existing.get(field), change?.before)
			) {
				throw new RequestDecisionError(
					`A katalógus időközben megváltozott ezen a mezőn: ${field}. Nyisd meg újra a kérést.`,
					'failed-precondition'
				);
			}

			written[field] = toCatalogValue(
				schema,
				field,
				request.after?.[field]
			);
		}

		const status = !accepted.length
			? 'rejected'
			: accepted.length === (request.changes ?? []).length
				? 'approved'
				: 'partially-approved';
		const featureKeys = [REQUEST_COLLECTION, RESPONSE_COLLECTION];

		if (accepted.length) {
			const name = written[schema.nameField];

			if (request.operation === 'create') {
				for (const field of schema.required) {
					if (!written[field]) {
						throw new RequestDecisionError(
							`Enélkül nem lehet felvenni a katalógusba: ${field}.`,
							'failed-precondition'
						);
					}
				}

				transaction.set(
					reference,
					stamp({
						...written,
						uid: reference.id,
						entityType: schema.entityType,
						meta: { ownerId: GLOBAL_OWNER_ID },
						searchParameters: searchParameters(String(name)),
					})
				);
			} else {
				transaction.update(
					reference,
					stamp({
						...written,
						// A név a keresést is viszi magával; a katalógus
						// listái ebből találják meg.
						...(typeof name === 'string'
							? { searchParameters: searchParameters(name) }
							: {}),
					})
				);
			}

			featureKeys.push(schema.collection);
		}

		transaction.set(
			responseReference,
			stamp({
				uid: responseReference.id,
				requestUid: input.requestId,
				userId: request.userId,
				status,
				verdicts: (request.changes ?? []).map((change) => ({
					field: change.field,
					kind: decided.get(change.field)?.kind ?? 'rejected',
					reason: decided.get(change.field)?.reason ?? null,
				})),
				adminNote:
					typeof input.adminNote === 'string' &&
					input.adminNote.trim()
						? input.adminNote.trim()
						: null,
				appliedPath: accepted.length ? reference.path : null,
				appliedFields: accepted,
				decidedBy: adminUid,
				decidedAt: Date.now(),
			})
		);
		transaction.update(
			requestReference,
			stamp({
				status,
				responseUid: responseReference.id,
				decidedAt: Date.now(),
				decidedBy: adminUid,
			})
		);
		touchCatalog(database, transaction, featureKeys);

		return {
			requestId: input.requestId,
			responseUid: responseReference.id,
			status,
			appliedPath: accepted.length ? reference.path : null,
			appliedFields: accepted,
		};
	});
}
