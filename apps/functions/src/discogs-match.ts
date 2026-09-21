/**
 * Név-összevetés a Discogs-találatokhoz. A `normalize` ugyanazt mondja, mint
 * a `tools/discogs/discogs-mapping.mjs` és a `libs/common/engine`
 * `normalizeCatalogName` — a functions külön npm-projekt, onnan nem tud
 * importálni, ezért a hármat együtt kell tartani.
 */

/** "Testament (2)" → "Testament" (Discogs megkülönböztető utótag). */
export function stripDiscogsSuffix(name: string): string {
	return String(name ?? '')
		.replace(/\s*\(\d+\)\s*$/, '')
		.trim();
}

/** Kisbetűs, ékezet- és írásjel-mentes alak az összevetéshez. */
export function normalize(value: string | null | undefined): string {
	return stripDiscogsSuffix(String(value ?? ''))
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/^the\s+/, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

/**
 * A katalógusszám összevetéshez: a Discogs hol szóközzel, hol kötőjellel írja
 * ugyanazt ("SRM-1-1035" ≡ "SRM 1 1035"), a nyomtatott címkén pedig gyakran
 * más a tagolás, mint az adatbázisban.
 */
export function normalizeCatno(value: string | null | undefined): string {
	return String(value ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

/** Csak a számjegyek: a vonalkód szóközökkel is jöhet a dekóderből. */
export function normalizeBarcode(value: string | null | undefined): string {
	return String(value ?? '').replace(/\D+/g, '');
}

/**
 * A Discogs keresési találat címe "Előadó - Album" alakú. Szétszedve, mert a
 * rangsoroláshoz külön kell a kettő.
 */
export function splitSearchTitle(title: string): {
	artist: string | null;
	album: string | null;
} {
	const separator = title.indexOf(' - ');

	if (separator < 0) return { artist: null, album: title.trim() || null };

	return {
		artist: title.slice(0, separator).trim() || null,
		album: title.slice(separator + 3).trim() || null,
	};
}
