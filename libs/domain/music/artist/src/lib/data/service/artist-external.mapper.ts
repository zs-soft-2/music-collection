import {
	ArtistExternalAlbum,
	ArtistType,
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
	'life-span'?: { begin?: string | null };
	genres?: { name: string; count: number }[];
	relations?: { type: string; url?: { resource: string } }[];
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

const normalize = (value: string): string =>
	value
		.toLowerCase()
		.replace(/\bmetal\b/g, '')
		.replace(/[^a-z0-9]/g, '');

const STYLE_BY_KEY = new Map<string, StyleEnum>(
	StyleList.map((style) => [normalize(style), style])
);

/** The search hit with the same name, the best scored group first. */
export function pickArtist(
	name: string,
	artists: MusicBrainzArtist[]
): MusicBrainzArtist | null {
	const wanted = name.trim().toLowerCase();
	const sameName = artists.filter(
		(artist) => artist.name.trim().toLowerCase() === wanted
	);
	const candidates = sameName.length ? sameName : artists.slice(0, 1);

	return (
		candidates.find((artist) => artist.type === 'Group') ??
		candidates[0] ??
		null
	);
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
