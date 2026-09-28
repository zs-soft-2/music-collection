import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	inject,
	linkedSignal,
	viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { map } from 'rxjs';

import { ProfileAccountComponent } from './component/profile-account/profile-account.component';
import { ProfileAppearanceComponent } from './component/profile-appearance/profile-appearance.component';
import { ProfileDemoTourComponent } from './component/profile-demo-tour/profile-demo-tour.component';
import { ProfileLanguageComponent } from './component/profile-language/profile-language.component';
import { ProfileListsComponent } from './component/profile-lists/profile-lists.component';
import { ProfileListeningComponent } from './component/profile-listening/profile-listening.component';
import { ProfilePlaybackComponent } from './component/profile-playback/profile-playback.component';
import { ProfilePrivacyComponent } from './component/profile-privacy/profile-privacy.component';
import { ProfileSectionComponent } from './component/profile-section/profile-section.component';
import { ProfileShelvesComponent } from './component/profile-shelves/profile-shelves.component';
import { ProfileSpotifyComponent } from './component/profile-spotify/profile-spotify.component';
import { ProfilePageStore } from './profile-page.store';
import {
	DEFAULT_PROFILE_TAB,
	PROFILE_TABS,
	ProfileTabId,
	isProfileTabId,
} from './profile-tabs';

/**
 * The user's own page: their account, and the settings that decide how the
 * app behaves for them.
 *
 * The settings are read a group at a time rather than all at once: ten cards
 * down one page is a wall, and most visits are here to change exactly one
 * thing. The tab is carried in the address, so a link can open the page on
 * the right group and a reload stays where the reader was.
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
		ProfileDemoTourComponent,
		ProfileLanguageComponent,
		ProfileListsComponent,
		ProfileListeningComponent,
		ProfilePlaybackComponent,
		ProfilePrivacyComponent,
		ProfileSectionComponent,
		ProfileShelvesComponent,
		ProfileSpotifyComponent,
	],
})
export class ProfilePageComponent {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);

	protected readonly store = inject(ProfilePageStore);
	protected readonly tabs = PROFILE_TABS;

	/** What the address bar names, so a link decides which group opens. */
	private readonly tabInUrl = toSignal(
		this.route.queryParamMap.pipe(map((params) => params.get('tab'))),
		{ initialValue: this.route.snapshot.queryParamMap.get('tab') }
	);

	/**
	 * The open group. It follows the address — a stranger's link, the back
	 * button, the tour arriving on `/profile` with no tab named — and a name
	 * the page does not know falls back to the first group rather than
	 * leaving the reader on an empty panel.
	 */
	protected readonly active = linkedSignal<ProfileTabId>(() => {
		const named = this.tabInUrl();

		return isProfileTabId(named) ? named : DEFAULT_PROFILE_TAB;
	});

	private readonly tabButtons =
		viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

	protected show(id: ProfileTabId): void {
		this.active.set(id);

		// The address replaces rather than stacks: reading through the groups
		// should not bury the page the collector came from under four entries
		// in the back button. The first group leaves no `tab` behind, so the
		// plain `/profile` link and the tour both land on it.
		void this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { tab: id === DEFAULT_PROFILE_TAB ? null : id },
			queryParamsHandling: 'merge',
			replaceUrl: true,
		});
	}

	/** The arrow keys walk the tab bar, as a tab bar is expected to. */
	protected onTabKeydown(event: KeyboardEvent, index: number): void {
		const steps: Record<string, number> = {
			ArrowRight: index + 1,
			ArrowLeft: index - 1,
			Home: 0,
			End: this.tabs.length - 1,
		};
		const target = steps[event.key];

		if (target === undefined) {
			return;
		}

		event.preventDefault();

		const wrapped = (target + this.tabs.length) % this.tabs.length;

		this.show(this.tabs[wrapped].id);
		this.tabButtons()[wrapped]?.nativeElement.focus();
	}
}
