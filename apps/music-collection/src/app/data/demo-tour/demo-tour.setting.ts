import { UserSetting } from '../user-settings';

/**
 * Whether the guided tour is offered to this collector. Null while they have
 * not decided — a collector who has never touched the switch is shown the
 * tour, because that is who it was written for.
 */
export interface DemoTourSettings {
	enabled: boolean | null;
}

/**
 * Kept with the collector's other settings, so switching the tour off on one
 * machine switches it off everywhere. Unlike the consents, the unanswered
 * state here means yes: nothing is published and nothing is embedded by a
 * walkthrough, so there is nothing to withhold until asked.
 */
export const DEMO_TOUR_SETTING: UserSetting<DemoTourSettings> = {
	id: 'demo-tour',
	featureKey: 'demo-tour-setting',
	storageKey: 'mc-demo-tour',
	toValue: (data) => ({
		enabled: typeof data['enabled'] === 'boolean' ? data['enabled'] : null,
	}),
	toDocument: ({ enabled }) => ({ enabled }),
};
