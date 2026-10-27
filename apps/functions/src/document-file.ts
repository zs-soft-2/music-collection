/**
 * Fájl iktatása a katalógusba, szerveroldalon: az objektum a `document/`
 * mappába, fölé egy dokumentum.
 *
 * Minden Storage-ban heverő fájl fölött van egy dokumentum — az adja neki a
 * nevet, a típust és a letöltési URL-t —, és ezen keresztül lehet megtalálni.
 * Ami csak a bucketben hever, azt senki nem leli meg többé.
 *
 * Azért külön fájl, mert már nem egy hívó van: a jelvény rajzolása
 * (`badge-generation.ts`) és a szám médiája (`track-media.ts`) is ugyanazt a
 * két lépést teszi, és egy fájl fölé nem kerülhet kétféle dokumentum.
 */

import { randomUUID } from 'node:crypto';

import { FieldValue, Firestore, Transaction } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import objectHash from 'object-hash';
import sharp from 'sharp';

import { stamp } from './catalog-sync';

export const DOCUMENT_COLLECTION = 'document';
/** A `DocumentUtilService.createFilePath` mintája: mappa + a név hashe. */
const DOCUMENT_FOLDER = '/document/';
/** `libs/common/api` EntityTypeEnum.Document. */
export const DOCUMENT_ENTITY_TYPE = 'Document';
/** Az admin darabszámláló dokumentuma, amit a kliens is karbantart. */
const ENTITY_QUANTITY_COLLECTION = 'entity-quantity';

export interface UploadedFile {
	/** Az objektum útja a bucketben. */
	storagePath: string;
	/** A letöltési URL — ez kerül a dokumentumba és a katalógusba. */
	filePath: string;
	/** Amit ténylegesen eltettünk: egy PNG-ből WebP lesz. */
	contentType: string;
}

/** Amit WebP-re kódolunk: a képmodellek PNG-t adnak, néha JPEG-et. */
const REENCODED = new Set(['image/png', 'image/jpeg']);
/**
 * A hosszabb oldal felső határa. A legnagyobb, amit kirajzolunk, a teljes
 * képernyős jelenet-háttér; ennél nagyobb képet egy képernyő sem mutat.
 */
const MAX_EDGE = 2048;
const WEBP_QUALITY = 82;

/**
 * A generált kép WebP-ként. A képmodell PNG-je átlagosan 1,6 MB, és a
 * főlapon több is van belőle egyszerre — a Lighthouse ezt mérte a legnagyobb
 * tételnek. A WebP az átlátszóságot is megtartja, amivel a jelvények
 * rajzolódnak, így a pin sem veszít semmit.
 *
 * Ha a kódolás valamiért elbukik, az eredeti bájtok mennek fel: egy nagy
 * kép még mindig jobb, mint egy elveszett generálás.
 */
async function compact(
	bytes: Buffer,
	contentType: string
): Promise<{ bytes: Buffer; contentType: string }> {
	if (!REENCODED.has(contentType)) {
		return { bytes, contentType };
	}

	try {
		const webp = await sharp(bytes)
			.resize({
				width: MAX_EDGE,
				height: MAX_EDGE,
				fit: 'inside',
				withoutEnlargement: true,
			})
			.webp({ quality: WEBP_QUALITY })
			.toBuffer();

		return webp.byteLength < bytes.byteLength
			? { bytes: webp, contentType: 'image/webp' }
			: { bytes, contentType };
	} catch {
		return { bytes, contentType };
	}
}

/**
 * A fájl feltöltése oda, ahová a borítók is mennek, és a `getDownloadURL`
 * alakú URL előállítása. A kliens SDK tokenes URL-t ad vissza; ugyanolyat
 * adunk, hogy a `filePath` mezők egyformák legyenek a katalógusban.
 */
export async function uploadDocumentFile(
	original: Buffer,
	fileName: string,
	originalContentType = 'image/png'
): Promise<UploadedFile> {
	const { bytes, contentType } = await compact(
		original,
		originalContentType
	);
	const bucket = getStorage().bucket();
	// A vezető perjelet a kliens SDK lenyeli, az Admin SDK nem — itt kell
	// levenni.
	const storagePath = `${DOCUMENT_FOLDER}${objectHash(fileName)}`.replace(
		/^\//,
		''
	);
	const token = randomUUID();

	await bucket.file(storagePath).save(bytes, {
		contentType,
		metadata: {
			cacheControl: 'public, max-age=31536000, immutable',
			metadata: { firebaseStorageDownloadTokens: token },
		},
	});

	return {
		storagePath,
		contentType,
		filePath:
			`https://firebasestorage.googleapis.com/v0/b/${bucket.name}` +
			`/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`,
	};
}

export interface DocumentRecord {
	uid: string;
	name: string;
	originalName: string;
	fileType: string;
	filePath: string;
	/** `DocumentCategoryEnum` értéke, ha a fájl tudja magáról, mire készült. */
	category?: string;
}

/**
 * A fájl fölötti dokumentum és az admin darabszám, egy tranzakció részeként.
 * A hívó dolga a `touchCatalog` — ő tudja, melyik feature-öket érintette.
 */
export function writeDocument(
	database: Firestore,
	transaction: Transaction,
	record: DocumentRecord,
	now: number
): void {
	transaction.set(
		database.collection(DOCUMENT_COLLECTION).doc(record.uid),
		stamp({
			uid: record.uid,
			entityType: DOCUMENT_ENTITY_TYPE,
			name: record.name,
			originalName: record.originalName,
			fileType: record.fileType,
			filePath: record.filePath,
			...(record.category ? { category: record.category } : {}),
			createdAt: now,
		})
	);
	transaction.set(
		database
			.collection(ENTITY_QUANTITY_COLLECTION)
			.doc(DOCUMENT_ENTITY_TYPE),
		{
			type: DOCUMENT_ENTITY_TYPE,
			quantity: FieldValue.increment(1),
			modifyDate: new Date(now),
		},
		{ merge: true }
	);
}
