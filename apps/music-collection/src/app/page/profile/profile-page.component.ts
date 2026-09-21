import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ProfileAccountComponent } from './component/profile-account/profile-account.component';
import { ProfileAppearanceComponent } from './component/profile-appearance/profile-appearance.component';
import { ProfileListsComponent } from './component/profile-lists/profile-lists.component';
import { ProfilePlaybackComponent } from './component/profile-playback/profile-playback.component';
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
		ProfileAccountComponent,
		ProfileAppearanceComponent,
		ProfileListsComponent,
		ProfilePlaybackComponent,
		ProfileSpotifyComponent,
	],
})
export class ProfilePageComponent {
	protected readonly store = inject(ProfilePageStore);
}
