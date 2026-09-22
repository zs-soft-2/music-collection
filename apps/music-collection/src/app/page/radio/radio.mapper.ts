import {
	CollectionItemPlacement,
	ShelfUnitLayout,
} from '@music-collection/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';

import {
	RADIO_LENGTH,
	RadioRecordName,
	radioStationId,
} from '../../data/radio';

import { CountedStation, PREVIEW_COUNT, RadioStationView } from './radio.model';

/**
 * A counted station as the page shows it: its records named rather than only
 * numbered. A record the catalog cannot name is passed over — the count says
 * how many there are, and the names are there to say what kind.
 */
export function toStationView(
	station: CountedStation,
	albumIds: readonly string[],
	names: ReadonlyMap<string, RadioRecordName>
): RadioStationView {
	return {
		...station,
		count: station.count ?? albumIds.length,
		preview: albumIds
			.slice(0, PREVIEW_COUNT)
			.flatMap((albumId) => names.get(albumId) ?? []),
	};
}

/** A copy, as the page asks whether a shelf station has anything to play. */
interface FiledCopy {
	placement?: CollectionItemPlacement | null;
}

const station = (
	view: Omit<CountedStation, 'id' | 'count' | 'albumIds'> & {
		count?: number | null;
		albumIds?: string[] | null;
	}
): CountedStation => ({
	count: null,
	albumIds: null,
	...view,
	id: radioStationId(view.station),
});

/**
 * The stations this collector can tune in, in the order the page offers
 * them: the catalog's own first, then their shelf, then the collections.
 *
 * A station is only offered where it could have something to play — a shelf
 * nobody has filed records into has no unit to play, and a collector with an
 * empty shelf has no taste to go on yet. The records themselves are counted
 * afterwards, so a station that turns out empty still falls away.
 */
export function radioStations(
	units: readonly ShelfUnitLayout[],
	standings: readonly MusicCollectionStanding[],
	owned: readonly FiledCopy[],
	playable: ReadonlySet<string> = new Set()
): CountedStation[] {
	const stations: CountedStation[] = [
		station({
			station: { kind: 'new' },
			label: 'Just in',
			description: 'The records the catalog has taken in most recently.',
			icon: 'pi pi-sparkles',
		}),
	];

	if (owned.length) {
		stations.push(
			station({
				station: { kind: 'taste' },
				label: 'Your taste',
				description:
					'Records in the styles your shelf is fullest of — owned or not.',
				icon: 'pi pi-heart',
			}),
			station({
				station: { kind: 'shelf' },
				label: 'Your shelf',
				description: 'Your own copies, one after another.',
				icon: 'pi pi-box',
			})
		);
	}

	stations.push(
		station({
			station: { kind: 'random' },
			label: 'Anything at all',
			description: 'The catalog, in no order whatsoever.',
			icon: 'pi pi-question-circle',
		})
	);

	for (const unit of units) {
		const filed = owned.filter(
			(copy) => copy.placement?.unitId === unit.id
		);

		if (filed.length) {
			stations.push(
				station({
					station: { kind: 'shelf', unitId: unit.id },
					label: unit.name || 'Unnamed unit',
					description:
						'The records you filed into this unit, read out the way they stand.',
					icon: 'pi pi-th-large',
				})
			);
		}
	}

	for (const standing of standings) {
		const albums = standing.resolved.albums.filter((album) =>
			playable.has(album.albumUid)
		);

		stations.push(
			station({
				// Resolving it again only to count it would cost a second
				// pass over the catalog for an answer already in hand.
				count: Math.min(albums.length, RADIO_LENGTH),
				albumIds: albums
					.slice(0, RADIO_LENGTH)
					.map((album) => album.albumUid),
				station: { kind: 'collection', slug: standing.collection.slug },
				label: standing.collection.name,
				description:
					standing.collection.description ??
					'Every record this collection asks for.',
				icon: standing.collection.icon || 'pi pi-star',
			})
		);
	}

	return stations;
}
