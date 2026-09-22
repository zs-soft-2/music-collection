import { UserSetting } from '../user-settings';

/**
 * Whether the collector lets the outside players onto the page. Null until
 * they have been asked — no player is embedded while the answer is missing.
 */
export interface ExternalPlayerSettings {
	consented: boolean | null;
}

/**
 * Kept like the other settings, so the answer follows the collector between
 * machines. There is no browser-only case worth keeping here: a guest gets no
 * player at all, so the question is only ever put to someone signed in.
 */
export const EXTERNAL_PLAYER_SETTING: UserSetting<ExternalPlayerSettings> = {
	id: 'external-player',
	featureKey: 'external-player-setting',
	storageKey: 'mc-external-player',
	toValue: (data) => ({
		consented:
			typeof data['consented'] === 'boolean' ? data['consented'] : null,
	}),
	toDocument: ({ consented }) => ({ consented }),
};
