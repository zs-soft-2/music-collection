import {
	PublicUserLocation,
	countryName,
	countryPosition,
} from '../../data/user-location';

/** One collector on the map — as much of them as they chose to show. */
export interface MapCollector {
	uid: string;
	/** The city they named, where their level shares it. */
	city: string | null;
	/** Their name, only where the pin is theirs to carry. */
	displayName: string | null;
	photoURL: string | null;
}

/** A country with the collectors who put themselves there. */
export interface MapCountry {
	code: string;
	name: string;
	/** [longitude, latitude] of the country's pin. */
	position: [number, number];
	collectors: MapCollector[];
	count: number;
}

/**
 * A named collector first, then one who named a city, then whoever shared
 * only their country: the list answers "who is here" before "how many".
 */
function weight(collector: MapCollector): number {
	if (collector.displayName) {
		return 0;
	}

	return collector.city ? 1 : 2;
}

function byPresence(one: MapCollector, other: MapCollector): number {
	const difference = weight(one) - weight(other);

	if (difference !== 0) {
		return difference;
	}

	return (one.displayName ?? one.city ?? '').localeCompare(
		other.displayName ?? other.city ?? ''
	);
}

/**
 * The shared locations, gathered per country. A pin stands for a country,
 * because that is all we are told: a city is a label the collector typed,
 * never a place we looked up, so it is never turned into a point of its own.
 */
export function toMapCountries(locations: PublicUserLocation[]): MapCountry[] {
	const collectors = new Map<string, MapCollector[]>();

	for (const location of locations) {
		// A country the atlas does not know cannot be drawn.
		if (!countryPosition(location.countryCode)) {
			continue;
		}

		const here = collectors.get(location.countryCode) ?? [];

		here.push({
			uid: location.uid,
			city: location.city ?? null,
			displayName: location.displayName ?? null,
			photoURL: location.photoURL ?? null,
		});
		collectors.set(location.countryCode, here);
	}

	return [...collectors.entries()]
		.map(([code, here]) => ({
			code,
			name: countryName(code),
			// Checked above: the country is in the atlas.
			position: countryPosition(code) as [number, number],
			collectors: [...here].sort(byPresence),
			count: here.length,
		}))
		.sort(
			(one, other) =>
				other.count - one.count || one.name.localeCompare(other.name)
		);
}
