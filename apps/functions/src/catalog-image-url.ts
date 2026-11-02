/**
 * A lemez borítója. A beírt cím előbbre való a csatolt borítónál.
 *
 * Ennek a modulnak van egy párja a böngésző oldalon
 * (`libs/common/engine/src/lib/image-url.ts`); a functions nem látja a
 * libeket (alkotmány XIII), ezért él itt külön. Aki az egyiket módosítja,
 * a másikat is módosítja — a szabály leírása:
 * `specs/60-artist-album-image-urls/contracts/image-url-rule.md`.
 *
 * A két hívó másképp olvassa a dokumentumát — a
 * `music-collection-badge-facts.ts` egy `Record<string, unknown>`
 * mezőtérképből, a `daily-question-compose.ts` a
 * `DocumentSnapshot.get()`-tel —, ezért a szabály a két nyers értéket kapja
 * meg, nem egy objektumot, és `typeof`-fal maga nézi meg őket: a Firestore
 * bármit adhat, és egy rossz típus nem állíthat meg egy jelvényt.
 */

/** Egy nyers mező, ha cím van benne. A csupa szóköz nem cím. */
function address(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	return value.trim() || null;
}

/** A csatolt képdokumentum útvonala, ha a mező egyáltalán dokumentum. */
function attachedPath(image: unknown): string | null {
	if (typeof image !== 'object' || image === null) {
		return null;
	}

	return address((image as { filePath?: unknown }).filePath);
}

export function toAlbumCoverUrl(
	coverImageUrl: unknown,
	coverImage: unknown
): string | null {
	return address(coverImageUrl) ?? attachedPath(coverImage);
}
