import { FormatEnum, StyleEnum, StyleList } from '../../../common';

/**
 * A style name as it is compared across sources: case, punctuation and the
 * word "metal" left out, so "Thrash", "thrash metal" and "Thrash Metal" all
 * name the same style of the catalog.
 */
const styleKey = (value: string): string =>
	value
		.toLowerCase()
		.replace(/\bmetal\b/g, '')
		.replace(/[^a-z0-9]/g, '');

const STYLE_BY_KEY = new Map<string, StyleEnum>(
	StyleList.map((style) => [styleKey(style), style])
);

/** The style of the catalog a source's name means; null when it knows none. */
export function toCatalogStyle(name: string): StyleEnum | null {
	return STYLE_BY_KEY.get(styleKey(name)) ?? null;
}

/**
 * The styles of the catalog among the names a source uses, in the order the
 * source gave them, each one once. What the catalog does not know is dropped:
 * both MusicBrainz genres and Discogs styles are far wider than its own list.
 */
export function toCatalogStyles(names: string[]): StyleEnum[] {
	return [
		...new Set(
			names
				.map(toCatalogStyle)
				.filter((style): style is StyleEnum => !!style)
		),
	];
}

/**
 * The format Discogs' own words name: its release descriptions ("LP",
 * "Album", "EP", "Single") mixed with the carrier ("Vinyl", "CD").
 *
 * Null where they say nothing about it, which is the common case in a
 * discography listing — Discogs gives no format with a master there. The
 * caller decides what to do with that; an album listing takes it for an LP,
 * as most of a band's own releases are.
 */
export function toDiscogsFormat(formats: string[]): FormatEnum | null {
	const words = new Set(formats.map((format) => format.trim().toLowerCase()));

	if (words.has('compilation')) return FormatEnum.compilation;
	if (words.has('maxi-single')) return FormatEnum.maxi;
	if (words.has('mini-album') || words.has('ep')) return FormatEnum.ep;
	if (words.has('single')) return FormatEnum.single;
	if (words.has('lp') || words.has('album')) return FormatEnum.lp;

	return null;
}

/** " … EP" in a title, the only hint left when Discogs gives no format. */
const EP_TITLE = /\b(e\.?p\.?)$/i;

/**
 * The format of an album in a Discogs discography. Where Discogs says nothing,
 * the title is the last hint and an LP the assumption: a band's own releases
 * are mostly albums, and the admin sees the format on every row before the
 * list is applied.
 */
export function toDiscogsAlbumFormat(
	formats: string[],
	name: string
): FormatEnum {
	return (
		toDiscogsFormat(formats) ??
		(EP_TITLE.test(name.trim()) ? FormatEnum.ep : FormatEnum.lp)
	);
}
