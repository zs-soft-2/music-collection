import { UserSetting } from '../user-settings';
import { isCountryCode } from './countries';

/**
 * How much of where a collector is may be shown to the others. It is the
 * user's own choice, and it decides what is published — not merely what the
 * map draws.
 */
export type UserLocationLevel = 'off' | 'country' | 'city' | 'profile';

/** A level that publishes something. */
export type SharedLocationLevel = Exclude<UserLocationLevel, 'off'>;

export const LOCATION_LEVELS: UserLocationLevel[] = [
	'off',
	'country',
	'city',
	'profile',
];

/** How long a city name may be; a label, not an address. */
export const CITY_MAX_LENGTH = 60;

/**
 * What the user told us. This is their own business: it lives under their
 * settings, which only they can read, and it keeps the city even while the
 * level does not publish it — turning the level back up must not mean
 * typing it again.
 */
export interface UserLocationSettings {
	level: UserLocationLevel;
	/** ISO 3166-1 alpha-2, e.g. "HU". */
	countryCode: string | null;
	/** The city as the user typed it; a label, never looked up. */
	city: string | null;
}

/** What the others get to see. Every field here is one the level allows. */
export interface PublicUserLocation {
	uid: string;
	level: SharedLocationLevel;
	countryCode: string;
	city?: string;
	displayName?: string;
	photoURL?: string;
}

/** Who is sharing, for the pin that carries a name. */
export interface LocationOwner {
	uid: string;
	displayName?: string | null;
	photoURL?: string | null;
}

export const NO_LOCATION: UserLocationSettings = {
	level: 'off',
	countryCode: null,
	city: null,
};

export const LOCATION_SETTING: UserSetting<UserLocationSettings> = {
	id: 'location',
	featureKey: 'location-setting',
	storageKey: 'mc-location',
	toValue: (data) => ({
		level: LOCATION_LEVELS.includes(data['level'] as UserLocationLevel)
			? (data['level'] as UserLocationLevel)
			: 'off',
		countryCode: isCountryCode(data['countryCode'])
			? data['countryCode']
			: null,
		city:
			typeof data['city'] === 'string' && data['city'].trim()
				? data['city'].trim().slice(0, CITY_MAX_LENGTH)
				: null,
	}),
	toDocument: ({ level, countryCode, city }) => ({
		level,
		countryCode,
		city,
	}),
};

/**
 * The document the others may read, or null when nothing is to be shared.
 *
 * This is where the level is enforced. A field the level does not allow is
 * not hidden from the map — it never leaves the user's own settings, so a
 * later change of mind about what the map draws cannot expose it either.
 */
export function toPublicLocation(
	settings: UserLocationSettings,
	owner: LocationOwner
): PublicUserLocation | null {
	if (settings.level === 'off' || !settings.countryCode || !owner.uid) {
		return null;
	}

	const shared: PublicUserLocation = {
		uid: owner.uid,
		level: settings.level,
		countryCode: settings.countryCode,
	};

	if (settings.level === 'country') {
		return shared;
	}

	const city = settings.city?.trim().slice(0, CITY_MAX_LENGTH);

	if (city) {
		shared.city = city;
	}

	if (settings.level === 'city') {
		return shared;
	}

	if (owner.displayName) {
		shared.displayName = owner.displayName;
	}

	if (owner.photoURL) {
		shared.photoURL = owner.photoURL;
	}

	return shared;
}
