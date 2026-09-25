/**
 * The catalog vocabularies the app owns, and therefore translates.
 *
 * What is *not* here is as deliberate as what is. Styles (`Thrash`,
 * `Melodic Death`, `Gothenburg`, `Grindcore`) stay in English in all three
 * languages, because that is what they are called in all three: the Hungarian
 * and German metal press writes "black metal" and "death-doom", not a
 * translation of them. Rendering "Fekete metál" on a sleeve's genre line
 * would not be localization, it would be a mistake.
 *
 * Artist, album, label and track names are not here either, for a plainer
 * reason: they are proper nouns, and nobody's copy of *Reign in Blood* is
 * called anything else in Budapest.
 */
export type CatalogGroup =
	/** `lp`, `ep`, `compilation`, … */
	| 'format'
	/** `reissue`, `remastered`, `box set`, … */
	| 'formatDescription'
	/** `vinyl`, `cd`, `cassette`, … */
	| 'media'
	/** Where an artist is from, as `CountryEnum` spells it. */
	| 'country'
	/** Where a pressing came out, as `ReleaseCountryEnum` spells it. */
	| 'releaseCountry'
	/** The Goldmine grades, spelled out. */
	| 'grade'
	/**
	 * What a musician plays: `guitar`, `drums`, `backing vocals`.
	 *
	 * Here and not with the styles because an instrument is a common noun,
	 * not a genre name: the Hungarian press writes "dob" and the German one
	 * "Schlagzeug", and neither writes "drums". The line-up is picked from
	 * `INSTRUMENT_GROUPS`, so the vocabulary is a closed list — but an older
	 * document may hold whatever the import wrote, and an unknown value is
	 * shown as it stands.
	 */
	| 'instrument'
	/** What kind of act an artist is: a band, a project, a formation. */
	| 'artistType'
	/**
	 * The same, as a heading over several of them.
	 *
	 * Its own group rather than an `s` on the end of the singular, which is
	 * what the home page used to do. English is the only one of the three
	 * languages where that works: German pluralises by ending and by umlaut,
	 * and Hungarian does not pluralise a noun after a number at all.
	 */
	| 'artistTypePlural'
	/**
	 * A decade of releases, keyed by its first year: `1980`.
	 *
	 * Spelled out per decade rather than built from a suffix, because
	 * Hungarian binds the suffix to how the number is *said*: the sixties are
	 * `1960-as` and the seventies `1970-es`, and no rule short of saying the
	 * number aloud tells them apart. Fourteen entries cover everything a
	 * record catalog holds, and each language writes what it actually says.
	 */
	| 'decade';

/**
 * The key a catalog value is looked up by: `catalog.format.box-set`.
 *
 * The value itself is slugged rather than used as it stands, so that a
 * dictionary stays readable and a value with a space, an ampersand or a
 * capital in it (`UK & Europe`, `The Netherlands`, `box set`) cannot produce
 * two keys for one thing.
 */
export function catalogKey(group: CatalogGroup, value: string): string {
	return `catalog.${group}.${catalogSlug(value)}`;
}

export function catalogSlug(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/\+/g, '-plus')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
