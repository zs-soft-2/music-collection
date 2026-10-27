/**
 * Classification of Discogs credit roles, shared by the album credits and the
 * artist line-up.
 */

export type CreditCategory =
	'performers' | 'songwriting' | 'production' | 'artwork' | 'other';

export const CREDIT_CATEGORY_LABELS: Record<CreditCategory, string> = {
	performers: 'Performers',
	songwriting: 'Songwriting',
	production: 'Production',
	artwork: 'Artwork & design',
	other: 'Other credits',
};

/** Checked in order: "Guitar Technician" is production, not a performance. */
const CATEGORY_PATTERNS: [CreditCategory, RegExp][] = [
	[
		'songwriting',
		/written|words by|lyrics|music by|composed|songwriter|arranged|orchestrated/i,
	],
	[
		'production',
		/produc|engineer|mix|master|record|lacquer|edited|technician|programm|a&r/i,
	],
	[
		'artwork',
		/artwork|design|cover|photo|layout|illustrat|paint|logo|art direction|typography|sleeve|graphics/i,
	],
	[
		'performers',
		/vocal|voice|guitar|bass|drum|percussion|keyboard|synth|piano|organ|sitar|timpani|violin|viola|cello|strings|sax|trumpet|trombone|horn|flute|harmonica|banjo|mandolin|choir|chorus|performer|instrument|finger snaps|clap|turntable|scratch|sampler|effects|lead|rhythm/i,
	],
];

/** Order of performers: singers first, then guitars, bass, drums, keys. */
const PERFORMER_ORDER = [
	/vocal|voice/i,
	/guitar/i,
	/bass/i,
	/drum|percussion/i,
	/keyboard|synth|piano|organ/i,
];

export function creditCategory(role: string): CreditCategory {
	return (
		CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(role))?.[0] ??
		'other'
	);
}

/** Sort rank of a performer role; unknown instruments come last. */
export function performerOrder(role: string): number {
	const index = PERFORMER_ORDER.findIndex((pattern) => pattern.test(role));
	return index < 0 ? PERFORMER_ORDER.length : index;
}
