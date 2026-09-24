import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ProfileAccountComponent } from './component/profile-account/profile-account.component';
import { ProfileAppearanceComponent } from './component/profile-appearance/profile-appearance.component';
import { ProfileLanguageComponent } from './component/profile-language/profile-language.component';
import { ProfileListsComponent } from './component/profile-lists/profile-lists.component';
import { ProfileListeningComponent } from './component/profile-listening/profile-listening.component';
import { ProfilePlaybackComponent } from './component/profile-playback/profile-playback.component';
import { ProfilePrivacyComponent } from './component/profile-privacy/profile-privacy.component';
import { ProfileShelvesComponent } from './component/profile-shelves/profile-shelves.component';
import { ProfileSpotifyComponent } from './component/profile-spotify/profile-spotify.component';
import { ProfilePageStore } from './profile-page.store';

/**
 * The user's own page: their account, and the settings that decide how the
 * app behaves for them. Each section stands on its own, so the page has room
 * for the ones still to come.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ProfilePageStore],
	selector: 'mc-profile-page',
	templateUrl: './profile-page.component.html',
	styleUrls: ['./profile-page.component.scss'],
	imports: [
		...I18N_IMPORTS,
		ProfileAccountComponent,
		ProfileAppearanceComponent,
		ProfileLanguageComponent,
		ProfileListsComponent,
		ProfileListeningComponent,
		ProfilePlaybackComponent,
		ProfilePrivacyComponent,
		ProfileShelvesComponent,
		ProfileSpotifyComponent,
	],
})
export class ProfilePageComponent {
	protected readonly store = inject(ProfilePageStore);
}
