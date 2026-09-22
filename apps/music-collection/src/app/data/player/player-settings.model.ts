import { UserSetting } from '../user-settings';

/** Where the music comes from; `auto` picks the best one available. */
export type PlayerSourceSetting = 'auto' | 'spotify' | 'youtube';
/** Where the music actually comes from, once `auto` has picked. */
export type PlayerSource = Exclude<PlayerSourceSetting, 'auto'>;
/** How the player opens when playback starts. */
export type PlayerView = 'panel' | 'stage';
/** Strength of the stage's visual effects. */
export type PlayerEffects = 'off' | 'subtle' | 'full';
/**
 * What fills the stage behind the words: the record's own cover, blurred, or
 * an animated world built from the song's visual profile.
 */
export type PlayerBackdrop = 'cover' | 'scene';
/** The kind of page the player is used on; each has its own defaults. */
export type PlayerContext = 'default' | 'album' | 'track';

export interface PlayerSettings {
	source: PlayerSourceSetting;
	view: PlayerView;
	/** Show the lyrics on the stage when there are any. */
	lyrics: boolean;
	effects: PlayerEffects;
	backdrop: PlayerBackdrop;
	/** Play on to the next track of the album. */
	autoAdvance: boolean;
	/**
	 * Stop where the record has to be turned over, and wait to be let on.
	 * Only a release whose positions name sides ("A1", "B2") has any.
	 */
	sideBreak: boolean;
}

/** What the user changed, per context; the rest comes from the defaults. */
export type PlayerSettingsOverrides = Partial<
	Record<PlayerContext, Partial<PlayerSettings>>
>;

const BASE: PlayerSettings = {
	source: 'auto',
	view: 'panel',
	lyrics: true,
	effects: 'subtle',
	backdrop: 'cover',
	autoAdvance: true,
	sideBreak: true,
};

export const PLAYER_DEFAULTS: Record<PlayerContext, PlayerSettings> = {
	default: BASE,
	album: BASE,
	// One track in focus: its lyrics on a full stage, stopping at its end.
	track: { ...BASE, effects: 'full', autoAdvance: false },
};

export const PLAYER_CONTEXT_LABELS: Record<PlayerContext, string> = {
	default: 'other pages',
	album: 'album pages',
	track: 'track pages',
};

export function resolvePlayerSettings(
	context: PlayerContext,
	overrides: PlayerSettingsOverrides
): PlayerSettings {
	return { ...PLAYER_DEFAULTS[context], ...overrides[context] };
}

export const PLAYER_SETTING: UserSetting<PlayerSettingsOverrides> = {
	id: 'player',
	featureKey: 'player-setting',
	storageKey: 'mc-player-settings',
	toValue: (data) => {
		// The browser used to keep the overrides without the wrapper; the
		// known contexts are picked out, so the sync stamps stay behind.
		const raw = (data['overrides'] ?? data) as PlayerSettingsOverrides;

		return Object.fromEntries(
			(Object.keys(PLAYER_DEFAULTS) as PlayerContext[])
				.filter((context) => !!raw[context])
				.map((context) => [context, raw[context]])
		);
	},
	toDocument: (overrides) => ({ overrides }),
};
