/**
 * Telling this project's own stored files apart from everything else.
 *
 * A `filePath` in the catalog is a Cloud Storage download URL, and most of
 * what the pages do with one — an `<img>`, a link — Angular's own sanitizing
 * already answers for. A frame does not: `bypassSecurityTrustResourceUrl`
 * hands the address straight to the browser, and whatever loads there runs on
 * its own origin inside our page.
 *
 * `firebasestorage.googleapis.com` is a single host that every Firebase
 * project on earth shares, so "it is a Storage URL" says nothing at all about
 * who put the file there. The bucket in the path is what says it. Anyone can
 * make a project, upload a page to it, and get an address that passes for one
 * of ours to everything but this check.
 */

/** The host `getDownloadURL` and the badge function both write. */
const DOWNLOAD_HOST = 'firebasestorage.googleapis.com';

/**
 * The address back when it is a download URL of `bucket`, `null` otherwise —
 * including when it is not an address this browser can even parse.
 *
 * The check goes through `URL` rather than comparing the start of the string,
 * because a prefix is cheap to satisfy from somewhere else:
 * `https://firebasestorage.googleapis.com@evil.example/v0/b/ours/o/x` begins
 * with exactly the right characters and loads evil.example. Parsing puts the
 * question where it belongs — on the host the browser would go to.
 */
export function ownStorageFileUrl(
	url: string | null | undefined,
	bucket: string | null | undefined
): string | null {
	if (!url || !bucket) {
		return null;
	}

	let address: URL;

	try {
		address = new URL(url);
	} catch {
		return null;
	}

	const isOwnFile =
		address.protocol === 'https:' &&
		address.host === DOWNLOAD_HOST &&
		// The object path is percent-encoded in a download URL, so a single
		// path segment is all this can ever be — it cannot climb out of the
		// bucket it names.
		address.pathname.startsWith(`/v0/b/${bucket}/o/`);

	return isOwnFile ? url : null;
}
