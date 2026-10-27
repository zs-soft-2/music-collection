import { UserSetting } from '../user-settings';

import { AvatarLook, toAvatarLook } from './avatar.model';

/**
 * The collector's assembled character, kept with their other settings.
 *
 * Only the choices are stored — twelve short strings — never the picture:
 * the wardrobe can gain a garment or be redrawn, and a look kept this way
 * takes the improvement with it. The rendered picture is a copy made for the
 * places that only have room for one small image.
 *
 * `null` while the collector has never built one, which is what tells the
 * profile to offer the editor rather than an avatar to edit.
 */
export interface AvatarSettings {
	look: AvatarLook | null;
}

export const AVATAR_SETTING: UserSetting<AvatarSettings> = {
	id: 'avatar',
	featureKey: 'avatar-setting',
	storageKey: 'mc-avatar',
	toValue: (data) => ({
		look:
			typeof data['look'] === 'object' && data['look'] !== null
				? toAvatarLook(data['look'] as Record<string, unknown>)
				: null,
	}),
	toDocument: ({ look }) => ({ look }),
};
