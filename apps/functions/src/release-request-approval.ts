/**
 * Release-kérés jóváhagyása: a kiadás a katalógusba kerül (Discogsról
 * importálva, vagy egy meglévő katalógus-kiadás), a kérő kollekciójába egy
 * példány, a kérés pedig `approved` lesz — egyetlen tranzakcióban, a kliens-
 * cache szinkronjával együtt.
 */

import {
	DocumentReference,
	DocumentSnapshot,
	Firestore,
} from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

import {
	searchParameters,
	stamp,
	touchCatalog,
	withoutUpdatedAt,
} from './catalog-sync';
import {
	CatalogAlbum,
	CatalogLabel,
	discogsLabelName,
	fetchDiscogsRelease,
	toCatalogRelease,
} from './discogs-release';

const RELEASE_REQUEST_COLLECTION = 'release-request';
const LABEL_COLLECTION = 'label';

interface ReleaseRequestDocument {
	userId: string;
	status: string;
	album: { uid: string; artistUid: string | null };
	discogsReleaseId: number | null;
}

export interface ApproveReleaseRequestInput {
	requestId: string;
	/** Meglévő katalógus-kiadás az album alatt; nélküle a Discogsról importál. */
	releaseUid?: string | null;
}

export interface ApproveReleaseRequestResult {
	releaseUid: string;
	collectionItemUid: string;
	/** Új kiadás került a katalógusba (Discogs-import). */
	importedRelease: boolean;
}

interface PreparedRelease {
	reference: DocumentReference;
	data: Record<string, unknown>;
	imported: boolean;
	/** Új katalógus-kiadó, ha a Discogs-kiadó még nincs meg. */
	newLabel: {
		reference: DocumentReference;
		data: Record<string, unknown>;
	} | null;
}

function requirePending(snapshot: DocumentSnapshot): ReleaseRequestDocument {
	const request = snapshot.data() as ReleaseRequestDocument | undefined;

	if (!request) {
		throw new HttpsError('not-found', 'Nincs ilyen kérés.');
	}
	if (request.status !== 'pending') {
		throw new HttpsError('failed-precondition', 'A kérést már elbírálták.');
	}

	return request;
}

/** A Discogs-kiadó a katalógusban (név szerint), vagy egy új kiadó. */
async function resolveLabel(
	database: Firestore,
	name: string | null
): Promise<{
	label: CatalogLabel | null;
	newLabel: PreparedRelease['newLabel'];
}> {
	if (!name) return { label: null, newLabel: null };

	const labels = await database.collection(LABEL_COLLECTION).get();
	const existing = labels.docs.find(
		(document) =>
			String(document.get('name') ?? '').toLowerCase() ===
			name.toLowerCase()
	);

	if (existing) {
		return {
			label: { uid: existing.id, name: String(existing.get('name')) },
			newLabel: null,
		};
	}

	const reference = database.collection(LABEL_COLLECTION).doc();

	return {
		label: { uid: reference.id, name },
		newLabel: {
			reference,
			data: {
				uid: reference.id,
				entityType: 'Label',
				name,
				parent: null,
				searchParameters: searchParameters(name),
			},
		},
	};
}

async function prepareRelease(
	database: Firestore,
	request: ReleaseRequestDocument,
	albumReference: DocumentReference,
	album: CatalogAlbum,
	releaseUid: string | null,
	token: string | null
): Promise<PreparedRelease> {
	const releases = albumReference.collection('release');

	if (releaseUid) {
		const snapshot = await releases.doc(releaseUid).get();

		if (!snapshot.exists) {
			throw new HttpsError(
				'not-found',
				'Nincs ilyen kiadás az albumnál.'
			);
		}

		return {
			reference: snapshot.ref,
			data: snapshot.data() as Record<string, unknown>,
			imported: false,
			newLabel: null,
		};
	}

	if (!request.discogsReleaseId) {
		throw new HttpsError(
			'failed-precondition',
			'Discogs-azonosító nélküli kérésnél válassz katalógus-kiadást.'
		);
	}

	// Egy korábbi jóváhagyás már importálhatta.
	const imported = await releases
		.where('discogsReleaseId', '==', request.discogsReleaseId)
		.limit(1)
		.get();

	if (!imported.empty) {
		const snapshot = imported.docs[0];

		return {
			reference: snapshot.ref,
			data: snapshot.data(),
			imported: false,
			newLabel: null,
		};
	}

	const discogs = await fetchDiscogsRelease(request.discogsReleaseId, {
		token,
	});
	const { label, newLabel } = await resolveLabel(
		database,
		discogsLabelName(discogs)
	);
	const reference = releases.doc();

	return {
		reference,
		data: toCatalogRelease(discogs, { uid: reference.id, album, label }),
		imported: true,
		newLabel,
	};
}

export async function approveReleaseRequest(
	database: Firestore,
	{ requestId, releaseUid = null }: ApproveReleaseRequestInput,
	{ adminUid, token }: { adminUid: string; token: string | null }
): Promise<ApproveReleaseRequestResult> {
	const requestReference = database
		.collection(RELEASE_REQUEST_COLLECTION)
		.doc(requestId);
	const request = requirePending(await requestReference.get());

	if (!request.album?.artistUid) {
		throw new HttpsError('failed-precondition', 'A kérés albuma hiányos.');
	}

	const albumReference = database.doc(
		`artist/${request.album.artistUid}/album/${request.album.uid}`
	);
	const albumSnapshot = await albumReference.get();

	if (!albumSnapshot.exists) {
		throw new HttpsError('not-found', 'Nincs ilyen album.');
	}

	const album = withoutUpdatedAt({
		...(albumSnapshot.data() as Record<string, unknown>),
		uid: albumSnapshot.id,
	}) as CatalogAlbum;
	const release = await prepareRelease(
		database,
		request,
		albumReference,
		album,
		releaseUid,
		token
	);

	const itemReference = database
		.collection('user')
		.doc(request.userId)
		.collection('collection-item')
		.doc();
	const embeddedRelease = withoutUpdatedAt(release.data);

	await database.runTransaction(async (transaction) => {
		// Közben más is elbírálhatta.
		requirePending(await transaction.get(requestReference));

		const featureKeys = ['collection-item', RELEASE_REQUEST_COLLECTION];

		if (release.newLabel) {
			transaction.set(
				release.newLabel.reference,
				stamp(release.newLabel.data)
			);
			featureKeys.push(LABEL_COLLECTION);
		}
		if (release.imported) {
			transaction.set(release.reference, stamp(release.data));
			featureKeys.push('release');
		}
		transaction.set(
			itemReference,
			stamp({
				uid: itemReference.id,
				entityType: 'Collection Item',
				userId: request.userId,
				date: Date.now(),
				release: embeddedRelease,
				searchParameters: searchParameters(
					String(embeddedRelease['name'] ?? '')
				),
			})
		);
		transaction.update(
			requestReference,
			stamp({
				status: 'approved',
				releaseUid: release.reference.id,
				collectionItemUid: itemReference.id,
				decidedAt: Date.now(),
				decidedBy: adminUid,
			})
		);
		touchCatalog(database, transaction, featureKeys);
	});

	return {
		releaseUid: release.reference.id,
		collectionItemUid: itemReference.id,
		importedRelease: release.imported,
	};
}
