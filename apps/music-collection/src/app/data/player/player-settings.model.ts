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
 * What fills the stage behind the words: the record's own cover, blurred, an
 * animated world built from the song's visual profile, or the song's own
 * pictures played through.
 *
 * `photos` falls back to the blurred cover for a song nobody has put any
 * pictures on, which is most of them — so it can be the default on a page
 * about one song without changing what anybody sees elsewhere.
 */
export type PlayerBackdrop = 'cover' | 'scene' | 'photos';
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
	// One track in focus: its lyrics on a full stage, stopping at its end,
	// and its own pictures behind the words where there are any.
	track: { ...BASE, effects: 'full', backdrop: 'photos', autoAdvance: false },
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
