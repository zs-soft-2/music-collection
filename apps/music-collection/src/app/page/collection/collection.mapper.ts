import { CollectionItemPlacement } from '@music-collection/api';

import {
	FORMAT_LABELS,
	FORMAT_ORDER,
	MediaFormat,
	ReleaseView,
} from '../../shared/music-ui';
import {
	CollectionGroup,
	CollectionSort,
	ChunkedReleaseGroup,
	CollectionStats,
	FormatFilter,
	ReleaseGroup,
	ShelfCompartmentView,
	ShelfUnitView,
} from './collection.model';
import { ShelfUnitLayout } from './shelf-layout.setting';
import { placementInLayout, placementKey, spotKey } from './shelf-placement';

export function filterReleases(
	releases: ReleaseView[],
	query: string,
	format: FormatFilter
): ReleaseView[] {
	const needle = query.trim().toLocaleLowerCase();

	return releases.filter(
		(release) =>
			(format === 'all' || release.format === format) &&
			(!needle ||
				release.title.toLocaleLowerCase().includes(needle) ||
				release.artistName.toLocaleLowerCase().includes(needle))
	);
}

/* One shared collator: `localeCompare` with options builds a new one per call. */
const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

const byText = (a: string, b: string) => collator.compare(a, b);

const byYear = (a: ReleaseView, b: ReleaseView) =>
	(a.year ?? Number.MAX_SAFE_INTEGER) - (b.year ?? Number.MAX_SAFE_INTEGER);

export function sortReleases(
	releases: ReleaseView[],
	sort: CollectionSort
): ReleaseView[] {
	const sorted = [...releases];

	switch (sort) {
		case 'artist':
			return sorted.sort(
				(a, b) => byText(a.artistName, b.artistName) || byYear(a, b)
			);
		case 'title':
			return sorted.sort((a, b) => byText(a.title, b.title));
		case 'year-desc':
			return sorted.sort(
				(a, b) =>
					(b.year ?? 0) - (a.year ?? 0) ||
					byText(a.artistName, b.artistName)
			);
		case 'year-asc':
			return sorted.sort(
				(a, b) => byYear(a, b) || byText(a.artistName, b.artistName)
			);
		case 'added':
			return sorted.sort((a, b) => b.addedAt - a.addedAt);
	}
}

function groupKey(
	release: ReleaseView,
	group: CollectionGroup
): { key: string; label: string } {
	switch (group) {
		case 'artist':
			return { key: release.artistName, label: release.artistName };
		case 'format':
			return {
				key: release.format,
				label: FORMAT_LABELS[release.format],
			};
		case 'style': {
			const style = release.styles[0] ?? 'Unknown style';
			return { key: style, label: style };
		}
		case 'decade': {
			if (release.year === null) {
				return { key: 'unknown', label: 'Unknown year' };
			}
			const decade = Math.floor(release.year / 10) * 10;
			return { key: String(decade), label: `${decade}s` };
		}
		case 'none':
			return { key: 'all', label: '' };
	}
}

/**
 * Groups keep the order in which their first item appears in the sorted list,
 * except where a natural order is more useful (format order, decades).
 */
export function groupReleases(
	releases: ReleaseView[],
	group: CollectionGroup
): ReleaseGroup[] {
	const groups = new Map<string, ReleaseGroup>();

	for (const release of releases) {
		const { key, label } = groupKey(release, group);
		const existing = groups.get(key);

		if (existing) {
			existing.items.push(release);
		} else {
			groups.set(key, { key, label, items: [release] });
		}
	}

	const result = Array.from(groups.values());

	if (group === 'format') {
		return result.sort(
			(a, b) =>
				FORMAT_ORDER.indexOf(a.key as MediaFormat) -
				FORMAT_ORDER.indexOf(b.key as MediaFormat)
		);
	}
	if (group === 'decade') {
		return result.sort((a, b) => byText(a.key, b.key));
	}
	if (group === 'style') {
		return result.sort((a, b) => b.items.length - a.items.length);
	}
	return result;
}

export function collectionStats(releases: ReleaseView[]): CollectionStats {
	const byFormat: Record<MediaFormat, number> = {
		vinyl: 0,
		cd: 0,
		cassette: 0,
		dvd: 0,
		boxset: 0,
		other: 0,
	};

	for (const release of releases) {
		byFormat[release.format]++;
	}

	return {
		total: releases.length,
		artists: new Set(releases.map((release) => release.artistName)).size,
		byFormat,
	};
}

/**
 * Packs groups into shelf compartments of a fixed capacity, keeping order.
 * Consecutive small groups share a compartment (labelled with the first and
 * last group), a group larger than a compartment is split across several.
 */
export function packShelf(
	groups: ReleaseGroup[],
	capacity: number
): ReleaseGroup[] {
	const compartments: ReleaseGroup[] = [];
	let items: ReleaseView[] = [];
	let labels: string[] = [];
	let key = '';

	const flush = () => {
		if (!items.length) {
			return;
		}
		const first = labels[0];
		const last = labels[labels.length - 1];

		/* Keyed by content, so a filter change does not rebuild every cubby. */
		compartments.push({
			key,
			label: first === last ? first : `${first} – ${last}`,
			items,
		});
		items = [];
		labels = [];
	};

	for (const group of groups) {
		if (group.items.length > capacity) {
			flush();
			const parts = Math.ceil(group.items.length / capacity);

			for (let part = 0; part < parts; part++) {
				items = group.items.slice(
					part * capacity,
					(part + 1) * capacity
				);
				labels = [`${group.label} · ${part + 1}/${parts}`];
				key = `${group.key}#${part}`;
				flush();
			}
			continue;
		}
		if (items.length + group.items.length > capacity) {
			flush();
		}
		if (!items.length) {
			key = group.key;
		}
		items = [...items, ...group.items];
		if (labels[labels.length - 1] !== group.label) {
			labels.push(group.label);
		}
	}
	flush();

	return compartments;
}

/** Splits every group into consecutive chunks of at most `size` releases. */
export function chunkGroups(
	groups: ReleaseGroup[],
	size: number
): ChunkedReleaseGroup[] {
	return groups.map((group) => {
		const chunks: ReleaseView[][] = [];

		for (let i = 0; i < group.items.length; i += size) {
			chunks.push(group.items.slice(i, i + size));
		}
		return {
			key: group.key,
			label: group.label,
			count: group.items.length,
			chunks,
		};
	});
}

/** A record the collector filed by hand, with the place they filed it in. */
export interface PlacedRelease {
	release: ReleaseView;
	placement: CollectionItemPlacement;
}

/**
 * Splits the records into the ones filed by hand and the ones the shelf
 * files itself. A placement naming a compartment the furniture no longer has
 * — the unit thrown out, or redrawn smaller — counts as unfiled: better back
 * among its neighbours than in a compartment nobody can see.
 */
export function splitByPlacement(
	releases: ReleaseView[],
	units: readonly ShelfUnitLayout[]
): { placed: PlacedRelease[]; loose: ReleaseView[] } {
	const placed: PlacedRelease[] = [];
	const loose: ReleaseView[] = [];

	for (const release of releases) {
		const placement = placementInLayout(release.placement, units);

		if (placement) {
			placed.push({ release, placement });
		} else {
			loose.push(release);
		}
	}
	return { placed, loose };
}

/** A compartment that is not one of the drawn ones: the wall, or the overflow. */
function loose(group: ReleaseGroup): ShelfCompartmentView {
	return { ...group, spot: null };
}

/** A compartment the collector filled themselves, in the order they left it. */
function handFiled(key: string, filed: PlacedRelease[]): ReleaseGroup {
	const items = [...filed]
		.sort((a, b) => a.placement.position - b.placement.position)
		.map((entry) => entry.release);
	const first = items[0].artistName;
	const last = items[items.length - 1].artistName;

	return {
		key,
		label: first === last ? first : `${first} – ${last}`,
		items,
	};
}

/**
 * Files the packed compartments into the furniture the collector drew, in
 * the order the units stand in the room: the first unit fills up before the
 * next one is touched, and a unit keeps every compartment it was drawn with,
 * empty ones included — the room is theirs, not ours to resize.
 *
 * Compartments the collector filed records into by hand are theirs alone:
 * the packed ones flow around them into what is left, so nothing the shelf
 * decides can push a record out of the place its owner gave it.
 *
 * Without drawn furniture the shelf stays one open wall that grows with the
 * collection. Records that no drawn compartment is left for end up in a unit
 * of their own, so nothing quietly disappears off the page.
 */
export function arrangeShelves(
	compartments: ReleaseGroup[],
	units: readonly ShelfUnitLayout[],
	placed: readonly PlacedRelease[] = []
): ShelfUnitView[] {
	if (!units.length) {
		return compartments.length
			? [
					{
						key: 'wall',
						name: '',
						columns: 0,
						compartments: compartments.map(loose),
						overflow: false,
					},
				]
			: [];
	}

	const byHand = new Map<string, PlacedRelease[]>();

	for (const entry of placed) {
		const key = placementKey(entry.placement);

		byHand.set(key, [...(byHand.get(key) ?? []), entry]);
	}

	const shelves: ShelfUnitView[] = [];
	let filed = 0;

	for (const unit of units) {
		const cells: ShelfCompartmentView[] = [];

		for (let row = 1; row <= unit.rows; row++) {
			for (let column = 1; column <= unit.columns; column++) {
				const key = spotKey(unit.id, row, column);
				const spot = { unitId: unit.id, row, column };
				const hand = byHand.get(key);

				if (hand?.length) {
					cells.push({ ...handFiled(key, hand), spot });
					continue;
				}

				const packed = compartments[filed];

				if (packed) {
					filed++;
					cells.push({ ...packed, spot });
				} else {
					cells.push({ key, label: '', items: [], spot });
				}
			}
		}

		shelves.push({
			key: unit.id,
			name: unit.name,
			columns: unit.columns,
			compartments: cells,
			overflow: false,
		});
	}

	const spilled = compartments.slice(filed);

	if (spilled.length) {
		shelves.push({
			key: 'overflow',
			name: '',
			columns: units[units.length - 1].columns,
			compartments: spilled.map(loose),
			overflow: true,
		});
	}

	return shelves;
}
