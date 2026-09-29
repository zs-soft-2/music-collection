import { CollectionItemPlacement } from '@music-collection/api';
import { CatalogLabeller, Translator } from '@music-collection/core/i18n';

import { FORMAT_ORDER, MediaFormat, ReleaseView } from '../../shared/music-ui';
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
import {
	DEFAULT_CUBBY,
	ShelfCubby,
	ShelfUnitLayout,
} from './shelf-layout.setting';
import {
	placementInLayout,
	placementKey,
	shelfSizeOf,
	spotKey,
} from './shelf-placement';

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

/**
 * The heading a release is filed under, and the stable key of that heading.
 *
 * The key is never translated and the label always is, which is the whole
 * distinction: grouping by format must put every LP together whichever
 * language the shelf is being read in, and a heading that doubled as an
 * identity would split the group in two the moment the reader switched.
 */
function groupKey(
	release: ReleaseView,
	group: CollectionGroup,
	words: GroupWords
): { key: string; label: string } {
	switch (group) {
		case 'artist':
			return { key: release.artistName, label: release.artistName };
		case 'format':
			return {
				key: release.format,
				label: words.catalog('media', release.format),
			};
		case 'style': {
			// Styles are not translated — "Melodic Death" is what the
			// Hungarian and German press call it too — but "no style at all"
			// is the app's own words, and is.
			const style = release.styles[0];

			return style
				? { key: style, label: style }
				: {
						key: 'unknown',
						label: words.t('page.collection.unknownStyle'),
					};
		}
		case 'decade': {
			if (release.year === null) {
				return {
					key: 'unknown',
					label: words.t('page.collection.unknownYear'),
				};
			}
			const decade = Math.floor(release.year / 10) * 10;

			return {
				key: String(decade),
				label: words.catalog('decade', String(decade)),
			};
		}
		case 'none':
			return { key: 'all', label: '' };
	}
}

/** What a grouping needs from the dictionary to write its headings. */
export interface GroupWords {
	t: Translator;
	catalog: CatalogLabeller;
}

/**
 * Groups keep the order in which their first item appears in the sorted list,
 * except where a natural order is more useful (format order, decades).
 */
export function groupReleases(
	releases: ReleaseView[],
	group: CollectionGroup,
	words: GroupWords
): ReleaseGroup[] {
	const groups = new Map<string, ReleaseGroup>();

	for (const release of releases) {
		const { key, label } = groupKey(release, group, words);
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
 * Packs the records into compartments of the sizes given, keeping order.
 *
 * A compartment fills by *length*: every copy eats its own spine thickness,
 * so a cubby that takes fifty-odd plain LPs takes far more CDs, fewer
 * gatefolds and fewer box sets still. It fills until the next record would
 * not go in, and the rest continue in the compartment after it.
 *
 * Height is the other half of it, and the reason a record can be passed
 * over: an LP offered a CD rack simply stays in the queue and waits for a
 * compartment tall enough. That is what makes a dedicated CD or cassette
 * shelf work — it draws the CDs and cassettes out of the collection and
 * leaves the records to the record shelving.
 *
 * `cubbies` are the compartments the shelf has, in the order it fills them.
 * Records left when they run out — or that nothing drawn is tall enough for
 * — keep coming in plain Kallax-sized cubbies, which is what the caller
 * shows as off the shelf. Off the shelf is not furniture, so it takes
 * anything rather than turning a record away twice.
 */
export function packShelf(
	groups: ReleaseGroup[],
	cubbies: readonly ShelfCubby[]
): ReleaseGroup[] {
	/* The records in filing order, each remembering the group it came from. */
	let queue = groups.flatMap((group) =>
		group.items.map((release) => ({ release, group }))
	);
	const compartments: ReleaseGroup[] = [];

	for (let at = 0; queue.length; at++) {
		const cubby = cubbies[at] ?? DEFAULT_CUBBY;
		const taken: typeof queue = [];
		const rest: typeof queue = [];
		let left = cubby.length;
		let full = false;

		for (const entry of queue) {
			const size = shelfSizeOf(entry.release);

			if (full || size.height > cubby.height) {
				rest.push(entry);
				continue;
			}
			if (size.thickness > left) {
				/* Not "too thick for the shelf" but "no room left in it". */
				full = true;
				rest.push(entry);
				continue;
			}
			left -= size.thickness;
			taken.push(entry);
		}

		/*
		 * Nothing in the queue is short enough for this compartment. It stays
		 * empty — a CD rack among record shelving is not a fault — and the
		 * records wait for the next one. Past the drawn furniture every
		 * compartment is alike, so there is nothing left to wait for.
		 */
		if (!taken.length) {
			if (at >= cubbies.length) {
				break;
			}
			compartments.push({ key: `gap-${at}`, label: '', items: [] });
			continue;
		}
		queue = rest;

		const labels = taken
			.map((entry) => entry.group.label)
			.filter((label, index, all) => label !== all[index - 1]);
		const first = labels[0];
		const end = labels[labels.length - 1];

		/* Keyed by content, so a filter change does not rebuild every cubby. */
		compartments.push({
			key: taken[0].group.key + '#' + taken[0].release.id,
			label: first === end ? first : `${first} – ${end}`,
			items: taken.map((entry) => entry.release),
		});
	}

	return numberRuns(compartments);
}

/**
 * One artist, or one format, spread over several compartments in a row reads
 * as "Judas Priest · 2/3" rather than as the same heading three times — so
 * it is plain that the run continues rather than starting again.
 */
function numberRuns(compartments: ReleaseGroup[]): ReleaseGroup[] {
	return compartments.map((compartment, index) => {
		if (!compartment.label) {
			return compartment;
		}
		const same = (at: number) =>
			compartments[at]?.label === compartment.label;
		let from = index;
		let to = index;

		while (same(from - 1)) from--;
		while (same(to + 1)) to++;

		return from === to
			? compartment
			: {
					...compartment,
					label: `${compartment.label} · ${index - from + 1}/${to - from + 1}`,
				};
	});
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
 * Packs the collection into the furniture the collector drew, in the order
 * the units stand in the room: the first unit fills up before the next one
 * is touched, and a unit keeps every compartment it was drawn with, empty
 * ones included — the room is theirs, not ours to resize.
 *
 * Packing and filing are one step because a compartment's size is its own:
 * how much goes into the fourth cubby cannot be worked out without knowing
 * which cubby the fourth one is, nor which ones the collector has already
 * filled by hand.
 *
 * Compartments the collector filed records into by hand are theirs alone:
 * the packed ones flow around them into what is left, so nothing the shelf
 * decides can push a record out of the place its owner gave it.
 *
 * Without drawn furniture the shelf stays one open wall that grows with the
 * collection, in compartments the size of a Kallax cubby. Records that no
 * drawn compartment is left for — or that nothing drawn is tall enough for —
 * end up in a unit of their own, so nothing quietly disappears off the page.
 */
export function arrangeShelves(
	groups: ReleaseGroup[],
	units: readonly ShelfUnitLayout[],
	placed: readonly PlacedRelease[] = []
): ShelfUnitView[] {
	if (!units.length) {
		const wall = packShelf(groups, []);

		return wall.length
			? [
					{
						key: 'wall',
						name: '',
						columns: 0,
						cubby: DEFAULT_CUBBY,
						compartments: wall.map(loose),
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

	/* The compartments the shelf may fill, in the order it fills them. */
	const open: { unit: ShelfUnitLayout; row: number; column: number }[] = [];

	for (const unit of units) {
		for (let row = 1; row <= unit.rows; row++) {
			for (let column = 1; column <= unit.columns; column++) {
				if (!byHand.has(spotKey(unit.id, row, column))) {
					open.push({ unit, row, column });
				}
			}
		}
	}

	const packed = packShelf(
		groups,
		open.map(({ unit }) => unit.cubby)
	);
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

				const group = packed[filed++];

				cells.push(
					group?.items.length
						? { ...group, spot }
						: { key, label: '', items: [], spot }
				);
			}
		}

		shelves.push({
			key: unit.id,
			name: unit.name,
			columns: unit.columns,
			cubby: unit.cubby,
			compartments: cells,
			overflow: false,
		});
	}

	const spilled = packed
		.slice(open.length)
		.filter((group) => group.items.length);

	if (spilled.length) {
		shelves.push({
			key: 'overflow',
			name: '',
			columns: units[units.length - 1].columns,
			/* Off the shelf is not furniture; it is drawn as plain cubbies. */
			cubby: DEFAULT_CUBBY,
			compartments: spilled.map(loose),
			overflow: true,
		});
	}

	return shelves;
}
