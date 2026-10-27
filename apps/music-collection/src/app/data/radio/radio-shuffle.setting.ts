import { UserSetting } from '../user-settings';

/**
 * Whether a queue is put on in a random order: the radio's stations, and a
 * compartment of the shelf played from the collection page.
 *
 * It is the collector's, not the station's — some stations choose at random
 * already ("Anything at all"), and this says what should happen to the ones
 * that do not. Kept with the other settings, so the answer holds between
 * sittings rather than being given again every time.
 */
export const RADIO_SHUFFLE_SETTING: UserSetting<boolean> = {
	id: 'radio',
	featureKey: 'radio-setting',
	storageKey: 'mc-radio-shuffle',
	toValue: (data) => data['shuffled'] === true,
	toDocument: (shuffled) => ({ shuffled }),
};
