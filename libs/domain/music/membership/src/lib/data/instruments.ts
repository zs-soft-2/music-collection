/**
 * The instruments a line-up can be filled in with, grouped as the field
 * offers them.
 *
 * A closed list rather than a free text field, so that one instrument has one
 * spelling and can therefore be translated: "Lead Guitar", "lead guitar" and
 * "Leadgitarre" typed into three rows are three instruments to a catalog and
 * one to a reader. Each value is a key into `catalog.instrument.*`, which is
 * what the screens show; the value stored stays English so that the sort
 * order, the daily question and the imports keep reading the same word.
 *
 * The spelling follows Discogs, because that is where most of these rows come
 * from: a member imported as "Backing Vocals" has to land on the option of
 * the same name rather than beside it.
 *
 * Order is by how often a rock catalog needs them, not alphabetical — the
 * field has a filter for finding a rare one, and singers, guitars and drums
 * should not need it.
 */
export interface InstrumentGroup {
	/** Names `ui.artistMembers.instrument-group.<key>`. */
	key: string;
	instruments: string[];
}

export const INSTRUMENT_GROUPS: InstrumentGroup[] = [
	{
		key: 'vocals',
		instruments: [
			'Vocals',
			'Lead Vocals',
			'Backing Vocals',
			'Spoken Word',
			'Choir',
		],
	},
	{
		key: 'guitars',
		instruments: [
			'Guitar',
			'Lead Guitar',
			'Rhythm Guitar',
			'Acoustic Guitar',
			'Electric Guitar',
			'Slide Guitar',
			'Twelve-String Guitar',
			'Bass',
			'Bass Guitar',
			'Double Bass',
		],
	},
	{
		key: 'keyboards',
		instruments: [
			'Keyboards',
			'Piano',
			'Electric Piano',
			'Organ',
			'Synthesizer',
			'Mellotron',
			'Harpsichord',
			'Accordion',
		],
	},
	{
		key: 'percussion',
		instruments: [
			'Drums',
			'Percussion',
			'Congas',
			'Tambourine',
			'Timpani',
			'Vibraphone',
			'Drum Machine',
		],
	},
	{
		key: 'strings',
		instruments: ['Violin', 'Viola', 'Cello', 'Strings', 'Harp'],
	},
	{
		key: 'winds',
		instruments: [
			'Saxophone',
			'Trumpet',
			'Trombone',
			'French Horn',
			'Horns',
			'Flute',
			'Clarinet',
			'Oboe',
			'Harmonica',
		],
	},
	{
		key: 'other',
		instruments: [
			'Banjo',
			'Mandolin',
			'Ukulele',
			'Sitar',
			'Theremin',
			'Turntables',
			'Sampler',
			'Programming',
			'Effects',
		],
	},
];

/** Every instrument the field offers, in the order the groups list them. */
export const INSTRUMENT_LIST: string[] = INSTRUMENT_GROUPS.flatMap(
	(group) => group.instruments
);

/**
 * The spellings the sources use for something the list already has.
 *
 * MusicBrainz names an instrument in the singular and Discogs in the plural,
 * and neither is wrong — but `Keyboard` and `Keyboards` in two rows of the
 * same line-up are one instrument written twice, and only one of them can be
 * translated. A plain plural is handled by the lookup itself; what is left
 * here is what no rule would catch.
 */
const SYNONYMS: Record<string, string> = {
	voice: 'Vocals',
	'lead vocal': 'Lead Vocals',
	'background vocals': 'Backing Vocals',
	keyboard: 'Keyboards',
	synth: 'Synthesizer',
	synthesiser: 'Synthesizer',
	'drum kit': 'Drums',
	'drum set': 'Drums',
	'electric bass': 'Bass Guitar',
	'acoustic bass': 'Double Bass',
	'upright bass': 'Double Bass',
	contrabass: 'Double Bass',
	'12-string guitar': 'Twelve-String Guitar',
	sax: 'Saxophone',
	'mouth harp': 'Harmonica',
	turntable: 'Turntables',
	'programmed by': 'Programming',
};

const CANONICAL = new Map<string, string>([
	...INSTRUMENT_LIST.map(
		(instrument) => [key(instrument), instrument] as const
	),
	...Object.entries(SYNONYMS).map(
		([spelling, instrument]) => [key(spelling), instrument] as const
	),
]);

/** What two spellings of one instrument have in common. */
function key(value: string): string {
	return (
		value
			// "Drums (drum set)", "Guitar [Lead]": the aside is not the name.
			.replace(/[([][^)\]]*[)\]]?/g, ' ')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim()
	);
}

/**
 * An instrument as the catalog spells it, where it knows the spelling.
 *
 * The sources do not agree with each other or with themselves: MusicBrainz
 * says `keyboard`, a Discogs credit says `Keyboards`, another says `Drums
 * (drum set)`. All three name something the list has, and a row that holds
 * the list's own word is a row that can be translated and picked again.
 *
 * A value the list does not know is handed back as it stands rather than
 * dropped — a rare instrument is still worth reading, in English.
 */
export function toCatalogInstrument(value: string): string {
	const cleaned = value.trim();
	const lookup = key(cleaned);

	return (
		CANONICAL.get(lookup) ??
		// "Guitars" for `Guitar`, "Drum" for `Drums`.
		CANONICAL.get(lookup.replace(/s$/, '')) ??
		CANONICAL.get(`${lookup}s`) ??
		cleaned
	);
}

/** The same for a row's whole list, with what it says twice said once. */
export function toCatalogInstruments(values: readonly string[]): string[] {
	return [...new Set(values.map(toCatalogInstrument).filter(Boolean))];
}

const KNOWN = new Set(INSTRUMENT_LIST);

/**
 * What a row holds that the list does not offer — what an import wrote before
 * there was a list, or what a Discogs credit calls an instrument.
 *
 * Such a value is kept and shown rather than dropped: a row saved from the
 * field would otherwise lose it without saying so. It cannot be picked again
 * once taken off, which is what a closed list means.
 */
export function unlistedInstruments(instruments: readonly string[]): string[] {
	return instruments.filter((instrument) => !KNOWN.has(instrument));
}
