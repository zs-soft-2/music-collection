import {
	CollectionItemPlacement,
	ShelfUnitLayout,
} from '@music-collection/api';
import { Translator } from '@music-collection/core/i18n';
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

/** The week's band, as the station that plays them is named after them. */
interface BandName {
	artistName: string;
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
	/** The words the app owns; the shelf and collection names are the user's. */
	t: Translator,
	playable: ReadonlySet<string> = new Set(),
	/** The week's band, where a run has chosen one; null keeps it off. */
	bandOfTheWeek: BandName | null = null
): CountedStation[] {
	const stations: CountedStation[] = [];

	// The week's own station opens the list — it is what the radio plays
	// unless the collector says otherwise. A week nobody chose a band for
	// simply has no such station, and the catalog's own leads instead.
	if (bandOfTheWeek) {
		stations.push(
			station({
				station: { kind: 'week' },
				label: t('radio.bandOfTheWeek.name', {
					name: bandOfTheWeek.artistName,
				}),
				description: t('radio.bandOfTheWeek.description'),
				icon: 'pi pi-star-fill',
			})
		);
	}

	stations.push(
		station({
			station: { kind: 'new' },
			label: t('radio.justIn.name'),
			description: t('radio.justIn.description'),
			icon: 'pi pi-sparkles',
		})
	);

	if (owned.length) {
		stations.push(
			station({
				station: { kind: 'taste' },
				label: t('radio.yourTaste.name'),
				description: t('radio.yourTaste.description'),
				icon: 'pi pi-heart',
			}),
			station({
				station: { kind: 'shelf' },
				label: t('radio.yourShelf.name'),
				description: t('radio.yourShelf.description'),
				icon: 'pi pi-box',
			})
		);
	}

	stations.push(
		station({
			station: { kind: 'random' },
			label: t('radio.anything.name'),
			description: t('radio.anything.description'),
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
					label: unit.name || t('radio.unnamedUnit'),
					description: t('radio.unit.description'),
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
					t('radio.collection.description'),
				icon: standing.collection.icon || 'pi pi-star',
			})
		);
	}

	return stations;
}
