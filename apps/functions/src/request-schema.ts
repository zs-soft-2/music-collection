/**
 * Mit írhat egy jóváhagyott kérés a katalógusba.
 *
 * A kérés a kliensről jön, tehát a benne álló állapot annyit ér, amennyit
 * ellenőrzünk belőle. Az admin mezőnkénti döntése az egyik szűrő — ez a
 * másik: mező a listán, típus és méret rendben, különben a döntés elszáll
 * ahelyett, hogy a katalógusba engedne valamit, amit a kliens nem is tud
 * megjeleníteni.
 *
 * A mezők a dokumentum felső szintjén állnak. Egy beágyazott objektum
 * (`discogs`) egészben dönthető el, mert az admin is egészben látja: külön
 * dönteni a `discogs.artistId`-ról és a `discogs.imageUrl`-ről nem az admin
 * kérdése, hanem a kódé.
 *
 * A `libs/common/api` párja ennek a megjelenítést írja le (címke, sorrend);
 * ez itt a katalógusba írás határa. A functions a saját `tsc`-jével fordul,
 * `libs`-et nem lát — a kettő nem is ugyanarra való.
 */

/**
 * A hívó adatának baja; a `code` a callable hibakódja lesz. A callable hibája
 * csak az index.ts-ben születik meg: a `firebase-functions/v2/https` importja
 * a firebase-admin auth ágát is behúzza, amit a tesztfutó nem tud betölteni —
 * és akkor a séma maradna teszt nélkül, amiből itt semmi nem maradhat.
 */
export class RequestDecisionError extends Error {
	public constructor(
		message: string,
		public readonly code:
			| 'invalid-argument'
			| 'failed-precondition'
			| 'not-found' = 'invalid-argument'
	) {
		super(message);
		this.name = 'RequestDecisionError';
	}
}

export type FieldKind =
	'string' | 'isoDate' | 'number' | 'boolean' | 'stringList' | 'map';

export interface FieldRule {
	kind: FieldKind;
	/** Szöveg maximális hossza; listánál elemenként. */
	maxLength?: number;
	/** Csak ezek az értékek. */
	values?: readonly string[];
	/** Listánál a legfeljebb ennyi elem. */
	maxItems?: number;
	/** `map`-nál a megengedett kulcsok és a szabályaik. */
	fields?: Record<string, FieldRule>;
}

export interface EntitySchema {
	/** A katalógus gyűjteménye, ahol a dokumentum él. */
	collection: string;
	/** A `libs/common/api` EntityTypeEnum értéke. */
	entityType: string;
	/** Ebből készül a kliens keresőmezője (`searchParameters`). */
	nameField: string;
	/** Enélkül nem lehet új dokumentumot felvenni. */
	required: readonly string[];
	/**
	 * A szülők gyűjteményei, ha a dokumentum azok alatt él: az albumé
	 * `['artist']`, a kiadásé `['artist', 'album']`. Üres lista: a gyűjtemény
	 * a katalógus gyökerében van.
	 */
	parentCollections: string[];
	fields: Record<string, FieldRule>;
}

const URL_MAX = 2000;

/**
 * Az `artist` a katalógus gyökerében él, és a gyűjtő tükörképe
 * (`user/{uid}/owned-artist`) ugyanezt a modellt írja.
 *
 * Ami hiányzik innen, az szándékos: a képek (`mainImage`, `headerImage`) egy
 * dokumentum-entitásra hivatkoznak, a `members` pedig a zenészekre — mindkettő
 * másik entitás, amit a kéréssel együtt kellene átvinni. Amíg ez nincs meg,
 * ezek a mezők nem hagyhatók jóvá: az admin elutasítja őket, indoklással.
 */
const ARTIST: EntitySchema = {
	collection: 'artist',
	entityType: 'Artist',
	nameField: 'name',
	required: ['name'],
	parentCollections: [],
	fields: {
		name: { kind: 'string', maxLength: 200 },
		artistType: {
			kind: 'string',
			values: ['band', 'project', 'formation'],
		},
		country: { kind: 'string', maxLength: 60 },
		description: { kind: 'string', maxLength: 10000 },
		genre: { kind: 'string', maxLength: 60 },
		styles: { kind: 'stringList', maxItems: 40, maxLength: 60 },
		sites: { kind: 'stringList', maxItems: 20, maxLength: URL_MAX },
		imageUrl: { kind: 'string', maxLength: URL_MAX },
		musicBrainzId: { kind: 'string', maxLength: 60 },
		// A kliens ISO stringként olvassa (ArtistModel.formedIn); egy Date
		// vagy egy Timestamp a helyén elrontaná az előadó oldalát.
		formedIn: { kind: 'isoDate' },
		discogs: {
			kind: 'map',
			fields: {
				artistId: { kind: 'number' },
				imageUrl: { kind: 'string', maxLength: URL_MAX },
			},
		},
	},
};

/**
 * Az album az előadó alatt él. A kapcsolatai (`artist`, `coverImage`) és a
 * Discogs-blokkja nincsenek a listán: az előbbi áthelyezés volna, nem
 * adatjavítás, az utóbbi pedig az importé — amit a Discogs mond, azt nem a
 * kérés írja felül.
 */
const ALBUM: EntitySchema = {
	collection: 'album',
	entityType: 'Album',
	nameField: 'name',
	required: ['name'],
	parentCollections: ['artist'],
	fields: {
		name: { kind: 'string', maxLength: 300 },
		// A kliens számként olvassa (AlbumModel.year); egy Date a helyén
		// elrontaná az album oldalát.
		year: { kind: 'number' },
		format: { kind: 'string', maxLength: 60 },
		genre: { kind: 'string', maxLength: 60 },
		styles: { kind: 'stringList', maxItems: 40, maxLength: 60 },
		songs: { kind: 'stringList', maxItems: 200, maxLength: 300 },
		coverImageUrl: { kind: 'string', maxLength: URL_MAX },
		spotifyAlbumId: { kind: 'string', maxLength: 60 },
		youtubePlaylistId: { kind: 'string', maxLength: 60 },
		youtubeVideoIds: { kind: 'stringList', maxItems: 50, maxLength: 40 },
	},
};

/**
 * A kiadás (préselés) az album alatt. A `generic` nincs a listán: azt nem
 * állítja senki kézzel — az a jele, hogy a kiadásról csak a hordozót tudjuk.
 */
const RELEASE: EntitySchema = {
	collection: 'release',
	entityType: 'Release',
	nameField: 'name',
	required: ['name', 'media'],
	parentCollections: ['artist', 'album'],
	fields: {
		name: { kind: 'string', maxLength: 300 },
		catno: { kind: 'string', maxLength: 120 },
		country: { kind: 'string', maxLength: 60 },
		formatDescription: { kind: 'string', maxLength: 60 },
		media: { kind: 'string', maxLength: 40 },
		// ReleaseModel.date: epoch ms, szám.
		date: { kind: 'number' },
		discogsReleaseId: { kind: 'number' },
	},
};

/** A kiadó. A `parent` (anyacég) nincs a listán: az a fa átrendezése. */
const LABEL: EntitySchema = {
	collection: 'label',
	entityType: 'Label',
	nameField: 'name',
	required: ['name'],
	parentCollections: [],
	fields: {
		name: { kind: 'string', maxLength: 200 },
		description: { kind: 'string', maxLength: 10000 },
		sites: { kind: 'stringList', maxItems: 20, maxLength: URL_MAX },
		imageUrl: { kind: 'string', maxLength: URL_MAX },
		discogsId: { kind: 'number' },
	},
};

const MUSICIAN: EntitySchema = {
	collection: 'musician',
	entityType: 'Musician',
	nameField: 'name',
	required: ['name'],
	parentCollections: [],
	fields: {
		name: { kind: 'string', maxLength: 200 },
		realName: { kind: 'string', maxLength: 200 },
		description: { kind: 'string', maxLength: 10000 },
		sites: { kind: 'stringList', maxItems: 20, maxLength: URL_MAX },
		aliases: { kind: 'stringList', maxItems: 40, maxLength: 200 },
		nameVariations: { kind: 'stringList', maxItems: 40, maxLength: 200 },
		imageUrl: { kind: 'string', maxLength: URL_MAX },
		discogsId: { kind: 'number' },
	},
};

/**
 * A szám. Az `albumUid` mező, nem útvonal — a számok a katalógus gyökerében
 * élnek —, ezért a listán van: nélküle egy új szám nem tudná, hova tartozik.
 */
const TRACK: EntitySchema = {
	collection: 'track',
	entityType: 'Track',
	nameField: 'name',
	required: ['name', 'albumUid'],
	parentCollections: [],
	fields: {
		albumUid: { kind: 'string', maxLength: 120 },
		releaseUid: { kind: 'string', maxLength: 120 },
		name: { kind: 'string', maxLength: 300 },
		index: { kind: 'number' },
		position: { kind: 'string', maxLength: 20 },
		duration: { kind: 'string', maxLength: 20 },
		durationSec: { kind: 'number' },
		heading: { kind: 'string', maxLength: 120 },
		spotifyTrackId: { kind: 'string', maxLength: 60 },
		youtubeVideoId: { kind: 'string', maxLength: 60 },
		writers: { kind: 'stringList', maxItems: 40, maxLength: 200 },
	},
};

/** Ki mit játszott az albumon. */
const CONTRIBUTION: EntitySchema = {
	collection: 'contribution',
	entityType: 'Contribution',
	nameField: 'name',
	required: ['name', 'albumUid', 'musicianUid', 'role'],
	parentCollections: [],
	fields: {
		albumUid: { kind: 'string', maxLength: 120 },
		musicianUid: { kind: 'string', maxLength: 120 },
		name: { kind: 'string', maxLength: 200 },
		creditedAs: { kind: 'string', maxLength: 200 },
		role: { kind: 'string', maxLength: 120 },
		roleDetail: { kind: 'string', maxLength: 120 },
		tracks: { kind: 'string', maxLength: 300 },
	},
};

/**
 * Ki volt a zenekar tagja. Az `albumCount` és az `albumUids` nincs a listán:
 * azokat a katalógus számolja, nem a gyűjtő mondja meg.
 */
const MEMBERSHIP: EntitySchema = {
	collection: 'membership',
	entityType: 'Membership',
	nameField: 'musicianName',
	required: ['artistUid', 'musicianUid', 'musicianName'],
	parentCollections: [],
	fields: {
		artistUid: { kind: 'string', maxLength: 120 },
		artistName: { kind: 'string', maxLength: 200 },
		musicianUid: { kind: 'string', maxLength: 120 },
		musicianName: { kind: 'string', maxLength: 200 },
		kind: { kind: 'string', values: ['member', 'guest'] },
		instruments: { kind: 'stringList', maxItems: 40, maxLength: 120 },
		from: { kind: 'number' },
		to: { kind: 'number' },
		active: { kind: 'boolean' },
	},
};

/**
 * Amire kérést el lehet bírálni. Ami nincs itt, arra a felület sem kínál
 * kérést, és ha mégis érkezne, az elbírálás elutasítja.
 *
 * A `document` szándékosan hiányzik: az egy feltöltött fájl, aminek a
 * tárolása külön kérdés, nem egy mezőnyi adat.
 */
export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
	artist: ARTIST,
	album: ALBUM,
	release: RELEASE,
	label: LABEL,
	musician: MUSICIAN,
	track: TRACK,
	contribution: CONTRIBUTION,
	membership: MEMBERSHIP,
};

export function schemaOf(featureKey: unknown): EntitySchema {
	const schema =
		typeof featureKey === 'string' ? ENTITY_SCHEMAS[featureKey] : undefined;

	if (!schema) {
		throw new RequestDecisionError(
			`Ilyen entitásra még nem lehet kérést elbírálni: ${String(featureKey)}.`,
			'failed-precondition'
		);
	}

	return schema;
}

/** Az üres érték: a mező törlése is döntés, és minden szabállyal fér. */
const isEmpty = (value: unknown): boolean =>
	value === null ||
	value === undefined ||
	value === '' ||
	(Array.isArray(value) && value.length === 0);

function isValidString(rule: FieldRule, value: unknown): boolean {
	return (
		typeof value === 'string' &&
		value.length <= (rule.maxLength ?? 1000) &&
		(!rule.values || rule.values.includes(value))
	);
}

/** Megfelel-e az érték a mező szabályának. */
export function isValidValue(rule: FieldRule, value: unknown): boolean {
	if (isEmpty(value)) {
		return true;
	}

	switch (rule.kind) {
		case 'string':
			return isValidString(rule, value);
		case 'isoDate':
			return (
				typeof value === 'string' &&
				value.length <= 40 &&
				!Number.isNaN(Date.parse(value))
			);
		case 'number':
			return typeof value === 'number' && Number.isFinite(value);
		case 'boolean':
			return typeof value === 'boolean';
		case 'stringList':
			return (
				Array.isArray(value) &&
				value.length <= (rule.maxItems ?? 100) &&
				value.every((item) => isValidString(rule, item))
			);
		case 'map':
			return (
				typeof value === 'object' &&
				!Array.isArray(value) &&
				Object.entries(value as Record<string, unknown>).every(
					([field, held]) => {
						const nested = rule.fields?.[field];

						return !!nested && isValidValue(nested, held);
					}
				)
			);
	}
}

/**
 * A mező értéke a katalógusba írható alakban, vagy a hiba, ami miatt nem.
 *
 * Amit az admin elfogadott, úgy megy be, ahogy a gyűjtő beküldte — az üres
 * szöveg üres szöveg marad, az üres lista üres lista. Egyedül a `undefined`
 * cserélődik: a Firestore nem tárolja, és a hiányzó mező úgyis üresen olvas.
 */
export function toCatalogValue(
	schema: EntitySchema,
	field: string,
	value: unknown
): unknown {
	const rule = schema.fields[field];

	if (!rule) {
		throw new RequestDecisionError(
			`Ezt a mezőt nem lehet a katalógusba írni: ${field}. Elutasítani lehet, jóváhagyni nem.`
		);
	}
	if (!isValidValue(rule, value)) {
		throw new RequestDecisionError(
			`A mező értéke nem megfelelő: ${field}.`
		);
	}

	return value === undefined ? null : value;
}
