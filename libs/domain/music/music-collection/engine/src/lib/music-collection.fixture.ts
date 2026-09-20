import {
	CountryEnum,
	FormatEnum,
	StyleEnum,
} from '@music-collection/common/api';
import {
	CatalogAlbum,
	CatalogArtist,
	MusicCollectionCatalog,
	OwnedCopy,
} from '@music-collection/domain/music-collection/api';

import { ResolvableCollection } from './music-collection-resolver';

export function album(
	uid: string,
	name: string,
	artistUid: string,
	artistName: string,
	year: number | null,
	styles: StyleEnum[],
	format: FormatEnum | null = FormatEnum.lp
): CatalogAlbum {
	return {
		uid,
		name,
		artistUid,
		artistName,
		year,
		styles,
		format,
		coverUrl: null,
	};
}

export function artist(
	uid: string,
	styles: StyleEnum[],
	country: CountryEnum | null = CountryEnum.USA
): CatalogArtist {
	return { uid, styles, country };
}

export function owned(albumUid: string): OwnedCopy {
	return { albumUid, disposedAt: null };
}

export function disposed(albumUid: string): OwnedCopy {
	return { albumUid, disposedAt: 1_600_000_000_000 };
}

/** "1988 Bay Area Thrash": studio albums of the 1988 Bay Area scene. */
export const BAY_AREA_1988: ResolvableCollection = {
	uid: 'bay-area-1988',
	criteriaVersion: 1,
	criteria: {
		years: { equals: 1988 },
		styles: { includesAny: [StyleEnum.Bay_Area_Thrash] },
		albumFormats: { includesAny: [FormatEnum.lp] },
	},
};

const BAY_AREA = [StyleEnum.Bay_Area_Thrash, StyleEnum.Thrash];

/**
 * A catalog holding six albums the collection asks for and four that look
 * close but fail on one criterion each: the year, the style, the format and
 * a missing year.
 */
export function bayAreaCatalog(): MusicCollectionCatalog {
	return {
		albums: [
			album('new-order', 'The New Order', 'testament', 'Testament', 1988, BAY_AREA),
			album('justice', '...And Justice for All', 'metallica', 'Metallica', 1988, BAY_AREA),
			album('fabulous', 'Fabulous Disaster', 'exodus', 'Exodus', 1988, BAY_AREA),
			album('forbidden-evil', 'Forbidden Evil', 'forbidden', 'Forbidden', 1988, BAY_AREA),
			album('frolic', 'Frolic Through the Park', 'death-angel', 'Death Angel', 1988, BAY_AREA),
			album('eternal', 'Eternal Nightmare', 'vio-lence', 'Vio-lence', 1988, BAY_AREA),
			// Right scene, wrong year.
			album('victims', 'Victims of Deception', 'heathen', 'Heathen', 1991, BAY_AREA),
			// Right year, wrong scene.
			album('aggression', 'Extreme Aggression', 'kreator', 'Kreator', 1988, [
				StyleEnum.Teutonic_Thrash,
				StyleEnum.Thrash,
			]),
			// Right year and scene, but not a studio album.
			album('eindhoven', 'Live at Eindhoven', 'testament', 'Testament', 1988, BAY_AREA, FormatEnum.live),
			// Right scene, year unknown.
			album('undated', 'Undated Demo', 'exodus', 'Exodus', null, BAY_AREA),
		],
		artists: [
			artist('testament', BAY_AREA),
			artist('metallica', BAY_AREA),
			artist('exodus', BAY_AREA),
			artist('forbidden', BAY_AREA),
			artist('death-angel', BAY_AREA),
			artist('vio-lence', BAY_AREA),
			artist('heathen', BAY_AREA),
			artist('kreator', [StyleEnum.Teutonic_Thrash], CountryEnum.Germany),
		],
	};
}

/** The six albums of `bayAreaCatalog` the collection resolves to. */
export const BAY_AREA_1988_ALBUM_UIDS = [
	'frolic',
	'fabulous',
	'forbidden-evil',
	'justice',
	'new-order',
	'eternal',
];

/** A collection of `size` albums, for counting rather than for matching. */
export function catalogOfSize(size: number): MusicCollectionCatalog {
	return {
		albums: Array.from({ length: size }, (_unused, index) =>
			album(
				`album-${index}`,
				`Album ${index}`,
				`artist-${index}`,
				`Artist ${String(index).padStart(2, '0')}`,
				1988,
				BAY_AREA
			)
		),
		artists: [],
	};
}
