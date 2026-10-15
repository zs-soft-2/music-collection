/**
 * A katalógus-bundle-ök a Storage-ban: feltöltés és a régiek takarítása.
 * Ugyanaz, mint a tools/sync/catalog-sync.mjs `uploadBundle` és
 * `removeOldBundles` párosa — a functions nem lát a tools alá.
 *
 * A `bundles/` mappát a storage.rules mindenkinek olvashatóvá teszi, írni
 * csak az Admin SDK ír bele.
 */

import { BundleBuilder } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/** A bucket, amelyikbe a bundle kerül. */
export type BundleBucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

/** A `BundleBuilder` belseje, amennyit a `buildBundle` használ. */
interface BundleBuilderInternals {
	bundleId: string;
	documents: Map<string, { metadata: unknown; document?: unknown }>;
	namedQueries: Map<string, unknown>;
	latestReadTime: { toProto(): { timestampValue: unknown } };
	elementToLengthPrefixedBuffer(element: Record<string, unknown>): Buffer;
}

/** A bundle-formátum verziója — az SDK `BUNDLE_VERSION`-je. */
const BUNDLE_VERSION = 1;

/**
 * A bundle bájtjai, ugyanazok, mint a `builder.build()`-éi, csak lineáris
 * időben.
 *
 * Az SDK `build()`-je minden elemnél `Buffer.concat`-tal másolja újra az
 * addig felgyűlt puffert: a rock szeleténél (40 ezer dokumentum, 80 ezer
 * elem, 42 MB) ez három perc és 3,5 GB eldobott memória a heapen kívül —
 * egy GiB-os function ebbe belehalna. Itt az elemek egyszer készülnek el, és
 * egyetlen összefűzéssel állnak össze.
 *
 * A builder belsejét használja; ha egy SDK-frissítés után az nem az, amire
 * számítunk, az SDK saját `build()`-jére esik vissza — lassú, de helyes.
 */
export function buildBundle(builder: BundleBuilder): Buffer {
	const internals = builder as unknown as Partial<BundleBuilderInternals>;

	if (
		!(internals.documents instanceof Map) ||
		!(internals.namedQueries instanceof Map) ||
		typeof internals.elementToLengthPrefixedBuffer !== 'function' ||
		!internals.latestReadTime
	) {
		return builder.build();
	}

	const { documents, namedQueries, latestReadTime } =
		internals as BundleBuilderInternals;
	const element = (value: Record<string, unknown>) =>
		(internals as BundleBuilderInternals).elementToLengthPrefixedBuffer(
			value
		);
	const chunks: Buffer[] = [];

	for (const namedQuery of namedQueries.values()) {
		chunks.push(element({ namedQuery }));
	}

	for (const bundled of documents.values()) {
		chunks.push(element({ documentMetadata: bundled.metadata }));

		if (bundled.document) {
			chunks.push(element({ document: bundled.document }));
		}
	}

	const body = Buffer.concat(chunks);
	const metadata = element({
		metadata: {
			id: internals.bundleId,
			createTime: latestReadTime.toProto().timestampValue,
			version: BUNDLE_VERSION,
			totalDocuments: documents.size,
			totalBytes: body.length,
		},
	});

	return Buffer.concat([metadata, body]);
}

/**
 * Egy megépített (gzipelt) bundle feltöltése. Egy kérésben, nem
 * folytathatóan: a function memóriájából megy, és a legnagyobb, a rock
 * bundle is pár MB.
 *
 * `immutable`: egy út egy tartalmat jelent, az útban a verzió másodperce áll.
 */
export async function uploadBundle(
	bucket: BundleBucket,
	path: string,
	gzipped: Buffer
): Promise<void> {
	await bucket.file(path).save(gzipped, {
		resumable: false,
		metadata: {
			contentType: 'application/octet-stream',
			contentEncoding: 'gzip',
			cacheControl: 'public, max-age=31536000, immutable',
		},
	});
}

/**
 * A mappa régi bundle-jeinek törlése, a legújabb `kept` darabot meghagyva:
 * egy kliens, amelyik épp az előzőt tölti, ne veszítse el letöltés közben.
 */
export async function removeOldBundles(
	bucket: BundleBucket,
	folder: string,
	current: string,
	kept = 2
): Promise<number> {
	const [files] = await bucket.getFiles({ prefix: `${folder}/` });
	const old = files
		.filter((file) => file.name !== current)
		.sort((a, b) => b.name.localeCompare(a.name, 'en', { numeric: true }))
		.slice(kept - 1);

	await Promise.all(old.map((file) => file.delete()));

	return old.length;
}
