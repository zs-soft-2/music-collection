import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';

import { UserSettingsEffect } from '../user-settings';
import { AvatarLook } from './avatar.model';
import { PROFILE_PICTURE, renderAvatar } from './avatar.render';
import { AvatarLayerSize, AvatarRepository } from './avatar.repository';
import { AVATAR_SETTING } from './avatar.setting';

/**
 * The collector's character: the choices, which are kept with their other
 * settings, and the picture, which is rendered from them and put where the
 * rest of the app already looks for an avatar.
 *
 * Saving does both, in that order. The choices are the real thing — they
 * survive a redrawn wardrobe and can be edited again — and the picture is a
 * copy made for the small round places. If the copy fails, the choices are
 * still saved, and the next save renders it again.
 */
@Injectable({ providedIn: 'root' })
export class AvatarEffect {
	private readonly settings = inject(UserSettingsEffect);
	private readonly repository = inject(AvatarRepository);

	/** The character the collector built, or null while they have not. */
	public look$(): Observable<AvatarLook | null> {
		return this.settings.value$(AVATAR_SETTING).pipe(map(({ look }) => look));
	}

	/** Where one layer of the wardrobe is drawn from. */
	public layerUrl(file: string, size: AvatarLayerSize = 'large'): string {
		return this.repository.layerUrl(file, size);
	}

	/** Whether the account's picture is one rendered from a character. */
	public isRenderedPicture(url: string): boolean {
		return this.repository.isRenderedPicture(url);
	}

	/**
	 * Keeps the character and renders the picture for it, giving back the
	 * address the profile should point the account at.
	 */
	public async save(look: AvatarLook, uid: string): Promise<string> {
		await this.settings.save(AVATAR_SETTING, { look });

		const picture = await renderAvatar(
			look,
			'front',
			(file) => this.repository.layerUrl(file),
			PROFILE_PICTURE
		);

		return this.repository.upload(uid, picture);
	}

	/** Forgets the character, picture and all. */
	public async clear(uid: string): Promise<void> {
		await this.settings.save(AVATAR_SETTING, { look: null });
		await this.repository.remove(uid);
	}
}
