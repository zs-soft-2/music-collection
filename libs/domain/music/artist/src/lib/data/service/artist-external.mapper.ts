import {
	ArtistExternalAlbum,
	ArtistExternalCandidate,
	ArtistExternalQuery,
	ArtistType,
	MUSICBRAINZ_ARTIST_URL,
	CountryEnum,
	FormatEnum,
	StyleEnum,
	StyleList,
} from '@music-collection/api';

export const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
export const WIKIPEDIA_SUMMARY_URL =
	'https://en.wikipedia.org/api/rest_v1/page/summary';

export interface MusicBrainzArtist {
	id: string;
	name: string;
	score?: number;
	type?: string | null;
	country?: string | null;
	/** MusicBrainz's own note telling artists of the same name apart. */
	disambiguation?: string | null;
	'life-span'?: { begin?: string | null };
	genres?: { name: string; count: number }[];
	relations?: { type: string; url?: { resource: string } }[];
	/** The search result carries tags, the lookup genres; both name styles. */
	tags?: { name: string; count: number }[];
}

export interface MusicBrainzSearch {
	artists: MusicBrainzArtist[];
}

export const COMMONS_FILE_PATH_URL =
	'https://commons.wikimedia.org/wiki/Special:FilePath';

export interface WikidataEntities {
	entities?: Record<
		string,
		{
			claims?: Record<
				string,
				{ mainsnak?: { datavalue?: { value?: unknown } } }[] | undefined
			>;
			sitelinks?: Record<string, { title: string } | undefined>;
		}
	>;
}

export interface WikipediaSummary {
	type?: string;
	extract?: string;
}

/** MusicBrainz country codes of the countries the catalog knows. */
const COUNTRY_BY_CODE: Record<string, CountryEnum> = {
	AU: CountryEnum.Australia,
	BR: CountryEnum.Brazil,
	CA: CountryEnum.Canada,
	CH: CountryEnum.Switzerland,
	DE: CountryEnum.Germany,
	DK: CountryEnum.Denmark,
	ES: CountryEnum.Spain,
	FI: CountryEnum.Finland,
	FR: CountryEnum.France,
	GB: CountryEnum.UK,
	GR: CountryEnum.Greece,
	IE: CountryEnum.Ireland,
	NL: CountryEnum.The_Netherlands,
	PL: CountryEnum.Poland,
	SE: CountryEnum.Sweden,
	US: CountryEnum.USA,
};

const CODE_BY_COUNTRY = new Map<CountryEnum, string>(
	Object.entries(COUNTRY_BY_CODE).map(([code, country]) => [country, code])
);

/** The MusicBrainz code of a country of the catalog; null when unknown. */
export function toCountryCode(country?: CountryEnum | null): string | null {
	return (country && CODE_BY_COUNTRY.get(country)) || null;
}

const normalize = (value: string): string =>
	value
		.toLowerCase()
		.replace(/\bmetal\b/g, '')
		.replace(/[^a-z0-9]/g, '');

const STYLE_BY_KEY = new Map<string, StyleEnum>(
	StyleList.map((style) => [normalize(style), style])
);

/** What each hint is worth when the hits of the same name are ranked. */
const COUNTRY_MATCH_RANK = 4;
const COUNTRY_MISMATCH_RANK = -4;
const STYLE_MATCH_RANK = 2;
/** Beyond this many matching styles the hit is already the right one. */
const STYLE_MATCH_LIMIT = 3;
const GROUP_RANK = 1;

/** The styles the catalog knows among the hit's tags and genres. */
function artistStyles(artist: MusicBrainzArtist): Set<StyleEnum> {
	const styles = [...(artist.tags ?? []), ...(artist.genres ?? [])]
		.map((tag) => STYLE_BY_KEY.get(normalize(tag.name)))
		.filter((style): style is StyleEnum => !!style);

	return new Set(styles);
}

/**
 * How well the hit fits what the form knows. A country the two disagree
 * on weighs against the hit; one the source does not know counts neither
 * way. Groups win a tie, as most artists of the catalog are bands.
 */
export function rankArtist(
	query: ArtistExternalQuery,
	artist: MusicBrainzArtist
): number {
	let rank = artist.type === 'Group' ? GROUP_RANK : 0;
	const wantedCode = toCountryCode(query.country);
	const code = artist.country?.toUpperCase() || null;

	if (wantedCode && code) {
		rank +=
			wantedCode === code ? COUNTRY_MATCH_RANK : COUNTRY_MISMATCH_RANK;
	}

	const styles = artistStyles(artist);
	const matches = (query.styles ?? []).filter((style) =>
		styles.has(style)
	).length;

	return rank + Math.min(matches, STYLE_MATCH_LIMIT) * STYLE_MATCH_RANK;
}

/**
 * The search hits of the same name, the one best fitting the country and
 * styles of the form first; MusicBrainz's own order breaks a tie. Without
 * a hit of the name only the best scored one is offered, as before: the
 * rest are other artists, not namesakes to choose between.
 */
export function rankArtists(
	query: ArtistExternalQuery,
	artists: MusicBrainzArtist[]
): MusicBrainzArtist[] {
	const wanted = query.name.trim().toLowerCase();
	const sameName = artists.filter(
		(artist) => artist.name.trim().toLowerCase() === wanted
	);
	const candidates = sameName.length ? sameName : artists.slice(0, 1);

	return candidates
		.map((artist, index) => ({
			artist,
			index,
			rank: rankArtist(query, artist),
		}))
		.sort((a, b) => b.rank - a.rank || a.index - b.index)
		.map(({ artist }) => artist);
}

/** The hit the query fits best; null when the search found nothing. */
export function pickArtist(
	query: ArtistExternalQuery,
	artists: MusicBrainzArtist[]
): MusicBrainzArtist | null {
	return rankArtists(query, artists)[0] ?? null;
}

export function toArtistType(type?: string | null): ArtistType | null {
	return type === 'Group' ? 'band' : null;
}

export function toCountry(code?: string | null): CountryEnum | null {
	return (code && COUNTRY_BY_CODE[code.toUpperCase()]) || null;
}

/** `1981`, `1981-10` or `1981-10-28` to a local date. */
export function toFormedIn(begin?: string | null): Date | null {
	const match = begin?.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
	if (!match) {
		return null;
	}

	return new Date(
		Number(match[1]),
		match[2] ? Number(match[2]) - 1 : 0,
		match[3] ? Number(match[3]) : 1
	);
}

/** The genres the catalog knows as styles, the most voted first. */
export function toStyles(
	genres: MusicBrainzArtist['genres'] = []
): StyleEnum[] {
	const styles = [...genres]
		.sort((a, b) => b.count - a.count)
		.map((genre) => STYLE_BY_KEY.get(normalize(genre.name)))
		.filter((style): style is StyleEnum => !!style);

	return [...new Set(styles)];
}

/**
 * The hit as the chooser shows it: MusicBrainz's own note, the type, the
 * country and the styles are what tell artists of one name apart. The
 * country is named as the catalog names it where it knows it, and by the
 * source's code where it does not, so nothing the source knows is lost.
 */
export function toExternalCandidate(
	artist: MusicBrainzArtist
): ArtistExternalCandidate {
	const code = artist.country?.toUpperCase() || null;

	return {
		country: toCountry(code) ?? code,
		formedIn: toFormedIn(artist['life-span']?.begin),
		musicBrainzId: artist.id,
		name: artist.name,
		note: artist.disambiguation?.trim() || null,
		sourceUrl: `${MUSICBRAINZ_ARTIST_URL}/${artist.id}`,
		styles: toStyles([...(artist.tags ?? []), ...(artist.genres ?? [])]),
		type: artist.type || null,
	};
}

/** The Wikidata item id (`Q…`) from the artist's url relations. */
export function toWikidataId(
	relations: MusicBrainzArtist['relations'] = []
): string | null {
	const url = relations.find((relation) => relation.type === 'wikidata')?.url
		?.resource;

	return url?.match(/(Q\d+)$/)?.[1] ?? null;
}

/** The Commons URL of the item's image (P18), scaled down; null if none. */
export function toCommonsImageUrl(
	claims: NonNullable<WikidataEntities['entities']>[string]['claims']
): string | null {
	const file = claims?.['P18']?.[0]?.mainsnak?.datavalue?.value;

	return typeof file === 'string' && file
		? `${COMMONS_FILE_PATH_URL}/${encodeURIComponent(
				file.replace(/ /g, '_')
			)}?width=1200`
		: null;
}

export interface MusicBrainzReleaseGroup {
	id: string;
	title: string;
	'primary-type'?: string | null;
	'secondary-types'?: string[];
	'first-release-date'?: string | null;
}

export interface MusicBrainzReleaseGroupSearch {
	'release-groups': MusicBrainzReleaseGroup[];
	count: number;
}

/**
 * The release group as an album: a studio album or an EP. Null for other
 * kinds (live, compilation, demo…) and for those without a release date.
 */
export function toExternalAlbum(
	group: MusicBrainzReleaseGroup
): ArtistExternalAlbum | null {
	const year = toFormedIn(group['first-release-date']);
	const format = group['secondary-types']?.length
		? null
		: group['primary-type'] === 'Album'
			? FormatEnum.lp
			: group['primary-type'] === 'EP'
				? FormatEnum.ep
				: null;

	return format && year
		? {
				format,
				name: group.title,
				sourceUrl: `https://musicbrainz.org/release-group/${group.id}`,
				year,
			}
		: null;
}
