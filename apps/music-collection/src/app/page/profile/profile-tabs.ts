/**
 * The groups the profile is read in.
 *
 * Ten settings on one page is a wall nobody scans; four tabs is a question
 * somebody can answer — "which of these am I here for?" — before they read a
 * single control. The order is the order a collector meets them: who they
 * are, then what they collect, then how it plays, then what is kept of it.
 */
export type ProfileTabId = 'account' | 'collection' | 'playback' | 'data';

export interface ProfileTab {
	id: ProfileTabId;
	labelKey: string;
	icon: string;
}

export const PROFILE_TABS: readonly ProfileTab[] = [
	{
		id: 'account',
		labelKey: 'page.profile.tabs.account',
		icon: 'pi-user',
	},
	{
		id: 'collection',
		labelKey: 'page.profile.tabs.collection',
		icon: 'pi-th-large',
	},
	{
		id: 'playback',
		labelKey: 'page.profile.tabs.playback',
		icon: 'pi-play-circle',
	},
	{
		id: 'data',
		labelKey: 'page.profile.tabs.data',
		icon: 'pi-shield',
	},
];

/**
 * The tab the page opens on when the address names none.
 *
 * It is also where the guided tour begins and ends. The tour presses its way
 * through all four groups — three of them are not drawn until it does — and
 * then comes back here for its last stop, which points at the tour's own
 * switch. So that switch has to stay under this tab, and this tab has to stay
 * the one a plain `/profile` link lands on, or the walk would end pointing at
 * something the page is not drawing.
 */
export const DEFAULT_PROFILE_TAB: ProfileTabId = PROFILE_TABS[0].id;

/** Whether a name out of the address bar is one of ours. */
export function isProfileTabId(value: string | null): value is ProfileTabId {
	return PROFILE_TABS.some((tab) => tab.id === value);
}
