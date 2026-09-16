import { MediaFormat, ReleaseView } from '../../shared/music-ui';

/** Filter, sort, group and view models of the collection page. */

export type CollectionView = 'grid' | 'list' | 'shelf';

export type CollectionSort =
	'artist' | 'title' | 'year-desc' | 'year-asc' | 'added';

export type CollectionGroup = 'none' | 'artist' | 'format' | 'style' | 'decade';

export type FormatFilter = MediaFormat | 'all';

export interface ReleaseGroup {
	key: string;
	label: string;
	items: ReleaseView[];
}

/** A group split into render chunks, so hundreds of cards never build in one tick. */
export interface ChunkedReleaseGroup {
	key: string;
	label: string;
	count: number;
	chunks: ReleaseView[][];
}

export interface CollectionStats {
	total: number;
	artists: number;
	byFormat: Record<MediaFormat, number>;
}

export const SORT_OPTIONS: { value: CollectionSort; label: string }[] = [
	{ value: 'artist', label: 'Artist A–Z' },
	{ value: 'title', label: 'Album A–Z' },
	{ value: 'year-desc', label: 'Newest release' },
	{ value: 'year-asc', label: 'Oldest release' },
	{ value: 'added', label: 'Recently added' },
];

export const GROUP_OPTIONS: { value: CollectionGroup; label: string }[] = [
	{ value: 'none', label: 'No grouping' },
	{ value: 'artist', label: 'Artist' },
	{ value: 'format', label: 'Format' },
	{ value: 'style', label: 'Style' },
	{ value: 'decade', label: 'Decade' },
];

export const VIEW_OPTIONS: {
	value: CollectionView;
	label: string;
	icon: string;
}[] = [
	{ value: 'grid', label: 'Grid', icon: 'pi pi-th-large' },
	{ value: 'list', label: 'List', icon: 'pi pi-list' },
	{ value: 'shelf', label: 'Shelf', icon: 'pi pi-book' },
];
