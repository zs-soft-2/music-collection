import type { ThemeMode } from '../../theme/theme.service';
import { UserSetting } from '../user-settings';

/**
 * How the app looks for this user. A field is null while nothing has been
 * stored yet — then whatever this browser is set to stands.
 */
export interface AppearanceSettings {
	theme: ThemeMode | null;
	/** Let the pages fill the full width of a large screen. */
	wide: boolean | null;
}

export const APPEARANCE_SETTING: UserSetting<AppearanceSettings> = {
	id: 'appearance',
	featureKey: 'appearance-setting',
	storageKey: 'mc-appearance',
	toValue: (data) => ({
		theme:
			data['theme'] === 'dark' || data['theme'] === 'light'
				? data['theme']
				: null,
		wide: typeof data['wide'] === 'boolean' ? data['wide'] : null,
	}),
	toDocument: ({ theme, wide }) => ({ theme, wide }),
};
