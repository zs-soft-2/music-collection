import { environment } from '../../../environments/environment';
import { UserSetting } from '../user-settings';

/**
 * Whether the app measures at all. The environment asks for it, and the
 * Firebase project has to have a GA4 property behind it — without the
 * measurement id there is nowhere to send anything, so the question is not
 * even put to the collector.
 */
export const MEASUREMENT_OFFERED =
	environment.analytics.enabled && !!environment.firebase.measurementId;

/**
 * Whether the collector lets the app measure how it is used. Null until they
 * have been asked — nothing is sent while the answer is missing.
 */
export interface MeasurementSettings {
	consented: boolean | null;
}

/**
 * Kept like the other settings: in the account when signed in, in this
 * browser otherwise. Signing in therefore brings the account's answer, and
 * an account that has never been asked asks once more — the consent belongs
 * to the person, not to the browser they happened to answer in.
 */
export const MEASUREMENT_SETTING: UserSetting<MeasurementSettings> = {
	id: 'measurement',
	featureKey: 'measurement-setting',
	storageKey: 'mc-measurement',
	toValue: (data) => ({
		consented:
			typeof data['consented'] === 'boolean' ? data['consented'] : null,
	}),
	toDocument: ({ consented }) => ({ consented }),
};
