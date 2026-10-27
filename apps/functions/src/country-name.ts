/**
 * Egy ország neve az ISO-kódjából, a futtató ICU-adatából.
 *
 * Eddig egy kétsoros tábla állt a helyén (`{ HU: 'Magyarország' }`), mert a
 * lap hatóköre egy ország volt. Az országválasztóval ez elfogyott: egy
 * táblát, ami kétszáz országot soroltat fel három nyelven, nem tartunk
 * karban, amikor a Node ugyanezt tudja — a Cloud Functions futtatójában
 * teljes ICU van, tehát az `Intl.DisplayNames` minden kódra válaszol.
 *
 * Két nyelven kérdezzük, és mindkettőnek megvan a maga dolga: a prompt
 * magyarul kérdez, a MusicBrainz `area` neve viszont angol, és azt kell
 * felismerni ahhoz, hogy az ország neve ne kerüljön a helyszín `city`
 * mezőjébe.
 */

/** Nyelvenként egy példány: az `Intl.DisplayNames` felépítése nem ingyen van. */
const byLocale = new Map<string, Intl.DisplayNames | null>();

function displayNames(locale: string): Intl.DisplayNames | null {
	if (!byLocale.has(locale)) {
		try {
			byLocale.set(
				locale,
				new Intl.DisplayNames([locale], { type: 'region' })
			);
		} catch {
			// ICU-adat nélkül a kód áll a név helyén. Nem hiba: a prompt és a
			// város-összevetés is elvan vele, csak csúnyább.
			byLocale.set(locale, null);
		}
	}

	return byLocale.get(locale) ?? null;
}

/** Az ország neve a kért nyelven, vagy a kódja, ha nincs rá név. */
export function countryNameIn(countryCode: string, locale: string): string {
	const code = countryCode.trim().toUpperCase();

	if (code.length !== 2) return countryCode;

	try {
		return displayNames(locale)?.of(code) ?? code;
	} catch {
		return code;
	}
}

/** A promptba kerülő név: a kérdés magyarul megy ki. */
export function hungarianCountryName(countryCode: string): string {
	return countryNameIn(countryCode, 'hu');
}

/** A MusicBrainz `area` nevével összevethető név. */
export function englishCountryName(countryCode: string): string {
	return countryNameIn(countryCode, 'en');
}
