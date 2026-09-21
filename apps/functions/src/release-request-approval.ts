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
import { DiscogsRelease } from './discogs-release';
import {
	releaseArtist,
	sameArtistName,
	toCatalogAlbum,
	toCatalogArtist,
} from './catalog-album';

const RELEASE_REQUEST_COLLECTION = 'release-request';
const LABEL_COLLECTION = 'label';

interface ReleaseRequestDocument {
	userId: string;
	status: string;
	/**
	 * A katalógus albuma. `uid` nélkül a kérés fotóról azonosított lemezre
	 * szól, aminek az albuma még nincs a katalógusban — a jóváhagyás akkor a
	 * Discogs-kiadásból hozza létre.
	 */
	album: {
		uid: string | null;
		artistUid: string | null;
		name?: string | null;
		artistName?: string | null;
	};
	discogsReleaseId: number | null;
}

const ARTIST_COLLECTION = 'artist';
const ALBUM_COLLECTION = 'album';

/** Az album a katalógusban, a hozzá létrehozandó dokumentumokkal együtt. */
interface PreparedAlbum {
	reference: DocumentReference;
	album: CatalogAlbum;
	newArtist: {
		reference: DocumentReference;
		data: Record<string, unknown>;
	} | null;
	newAlbum: {
		reference: DocumentReference;
		data: Record<string, unknown>;
	} | null;
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
	/** Az album, amely alá a kiadás került. */
	albumUid: string;
	/** Az albumot is a Discogsról hoztuk létre (album nélküli kérés). */
	importedAlbum: boolean;
	/** Az előadót is létre kellett hozni. */
	importedArtist: boolean;
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

/** A katalógus előadója névre, vagy egy új előadó a Discogs-kiadásból. */
async function resolveArtist(
	database: Firestore,
	discogs: DiscogsRelease
): Promise<{
	reference: DocumentReference;
	name: string;
	newArtist: PreparedAlbum['newArtist'];
}> {
	const artist = releaseArtist(discogs);

	if (!artist) {
		throw new HttpsError(
			'failed-precondition',
			'A Discogs-kiadásnak nincs előadója.'
		);
	}

	const artists = await database.collection(ARTIST_COLLECTION).get();
	const existing = artists.docs.find((document) =>
		sameArtistName(String(document.get('name') ?? ''), artist.name)
	);

	if (existing) {
		return {
			reference: existing.ref,
			name: String(existing.get('name')),
			newArtist: null,
		};
	}

	const reference = database.collection(ARTIST_COLLECTION).doc();

	return {
		reference,
		name: artist.name,
		newArtist: {
			reference,
			data: toCatalogArtist(reference.id, artist),
		},
	};
}

/**
 * A kérés albuma: a katalógusból, vagy — album nélküli (fotóról azonosított)
 * kérésnél — a Discogs-kiadásból létrehozva, az előadójával együtt.
 */
async function prepareAlbum(
	database: Firestore,
	request: ReleaseRequestDocument,
	discogs: DiscogsRelease | null
): Promise<PreparedAlbum> {
	if (request.album?.uid && request.album.artistUid) {
		const reference = database.doc(
			`${ARTIST_COLLECTION}/${request.album.artistUid}/${ALBUM_COLLECTION}/${request.album.uid}`
		);
		const snapshot = await reference.get();

		if (!snapshot.exists) {
			throw new HttpsError('not-found', 'Nincs ilyen album.');
		}

		return {
			reference,
			album: withoutUpdatedAt({
				...(snapshot.data() as Record<string, unknown>),
				uid: snapshot.id,
			}) as CatalogAlbum,
			newArtist: null,
			newAlbum: null,
		};
	}

	if (!discogs) {
		throw new HttpsError(
			'failed-precondition',
			'Album nélküli kéréshez Discogs-kiadás kell.'
		);
	}

	const artist = await resolveArtist(database, discogs);
	const albums = artist.reference.collection(ALBUM_COLLECTION);
	// Egy korábbi jóváhagyás már importálhatta ugyanezt az albumot.
	const imported = await albums
		.where('discogs.releaseId', '==', discogs.id)
		.limit(1)
		.get();

	if (!imported.empty && !artist.newArtist) {
		const snapshot = imported.docs[0];

		return {
			reference: snapshot.ref,
			album: withoutUpdatedAt({
				...snapshot.data(),
				uid: snapshot.id,
			}) as CatalogAlbum,
			newArtist: null,
			newAlbum: null,
		};
	}

	const reference = albums.doc();
	const data = toCatalogAlbum(discogs, {
		uid: reference.id,
		artist: { uid: artist.reference.id, name: artist.name },
	});

	return {
		reference,
		album: withoutUpdatedAt(data) as CatalogAlbum,
		newArtist: artist.newArtist,
		newAlbum: { reference, data },
	};
}

async function prepareRelease(
	database: Firestore,
	request: ReleaseRequestDocument,
	albumReference: DocumentReference,
	album: CatalogAlbum,
	releaseUid: string | null,
	token: string | null,
	/** Az album importjához már letöltött kiadás; ne kérjük le kétszer. */
	fetched: DiscogsRelease | null = null
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

	const discogs =
		fetched ??
		(await fetchDiscogsRelease(request.discogsReleaseId, { token }));
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
	// Album nélküli (fotóról azonosított) kérésnél a Discogs-kiadásból lesz
	// az album és az előadó is; a kiadást egyszer töltjük le.
	const discogs =
		!request.album?.uid && request.discogsReleaseId
			? await fetchDiscogsRelease(request.discogsReleaseId, { token })
			: null;
	const prepared = await prepareAlbum(database, request, discogs);
	const release = await prepareRelease(
		database,
		request,
		prepared.reference,
		prepared.album,
		releaseUid,
		token,
		discogs
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

		if (prepared.newArtist) {
			transaction.set(
				prepared.newArtist.reference,
				stamp(prepared.newArtist.data)
			);
			featureKeys.push(ARTIST_COLLECTION);
		}
		if (prepared.newAlbum) {
			transaction.set(
				prepared.newAlbum.reference,
				stamp(prepared.newAlbum.data)
			);
			featureKeys.push(ALBUM_COLLECTION);
		}
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
		albumUid: prepared.reference.id,
		importedAlbum: !!prepared.newAlbum,
		importedArtist: !!prepared.newArtist,
	};
}
