const rules = new Map<string, Intl.PluralRules>();

/**
 * Which plural form the language wants for this number — the `one` or the
 * `other` half of a key pair such as `home.group.albums.one`.
 *
 * Asked of `Intl` rather than assumed, because the three languages disagree
 * in ways no single rule covers:
 *
 *   1 album   / 2 albums   — English pluralises the noun
 *   1 album   / 2 album    — Hungarian does not, after a number
 *   1 Album   / 2 Alben    — German does, and irregularly
 *
 * Only `one` and `other` ever come back for these three; asking properly is
 * what would let a fourth language in without changing this file.
 */
export function pluralCategory(
	locale: string,
	count: number
): Intl.LDMLPluralRule {
	let rule = rules.get(locale);

	if (!rule) {
		rule = new Intl.PluralRules(locale);
		rules.set(locale, rule);
	}

	return rule.select(count);
}
