import { Injectable, inject } from '@angular/core';
import {
	Storage,
	deleteObject,
	ref,
	uploadBytes,
} from '@angular/fire/storage';

/**
 * Where the wardrobe's layers are published
 * (`tools/avatar/upload-assets.mjs --version v1`).
 *
 * The version is in the path because the files are served with a cache
 * header that never expires: a browser that has drawn `v1` need never ask
 * for it again. A redrawn wardrobe is uploaded as `v2` and this constant
 * follows it — overwriting the folder in place would leave every browser
 * that has been here showing the garments it already has.
 */
const LAYER_FOLDER = 'avatar/v1';
/**
 * The same wardrobe cut for a phone (512px against 768, and squeezed a
 * little harder): about half the bytes, and at the size the stage has on a
 * phone — 40dvh, so some 260 pixels tall — indistinguishable.
 */
const SMALL_LAYER_FOLDER = `${LAYER_FOLDER}/sm`;
/**
 * Which cut of the wardrobe to draw from. The saved picture is always
 * rendered from the large one: it crops to the head and shoulders, some 60%
 * of the frame, and a crop of the small set would be soft.
 */
export type AvatarLayerSize = 'small' | 'large';

/** Where a collector's own rendered picture goes. */
const RENDERED_FOLDER = 'user-avatar';
/** One name per collector, so a new picture replaces the one before it. */
const RENDERED_FILE = 'avatar.jpg';

/**
 * The avatar's files in Cloud Storage: the shared wardrobe, which everyone
 * reads and only the upload script writes, and the collector's own rendered
 * picture under `user-avatar/{uid}/`.
 *
 * The layers are addressed by URL rather than through `getDownloadURL`: the
 * wardrobe is three hundred files, and asking the server for each one's URL
 * would be three hundred round trips before the first garment appears. The
 * public download address of a file is derivable, so it is derived — which
 * is why `storage.rules` has to let anyone read the folder.
 */
@Injectable({ providedIn: 'root' })
export class AvatarRepository {
	private readonly storage = inject(Storage);

	/** The address one layer of the wardrobe is drawn from. */
	public layerUrl(file: string, size: AvatarLayerSize = 'large'): string {
		// The thumbnails are 108×128 to begin with and are only published
		// once, next to the full-size layers.
		const folder =
			size === 'small' && !file.startsWith('thumb-')
				? SMALL_LAYER_FOLDER
				: LAYER_FOLDER;

		return this.downloadUrl(`${folder}/${file}`);
	}

	/**
	 * Puts the rendered picture in the collector's place and gives back the
	 * address to show it from. The address carries a cache-busting stamp: the
	 * path never changes, so without one the browsers — and everyone else's
	 * copy of the profile — would keep showing the picture it replaced.
	 */
	public async upload(uid: string, blob: Blob): Promise<string> {
		const path = this.renderedPath(uid);

		await uploadBytes(ref(this.storage, path), blob, {
			contentType: 'image/jpeg',
			cacheControl: 'public, max-age=3600',
		});

		return `${this.downloadUrl(path)}&v=${Date.now()}`;
	}

	/**
	 * Takes the picture away. A file nobody points at any more costs a few
	 * kilobytes, so a failed delete is not worth an error in the collector's
	 * way — the profile has already let go of it.
	 */
	public async remove(uid: string): Promise<void> {
		try {
			await deleteObject(ref(this.storage, this.renderedPath(uid)));
		} catch (error) {
			console.error(error);
		}
	}

	/**
	 * Whether an address points at a picture rendered from a character,
	 * rather than at a photo from the sign-in provider. The profile shows the
	 * kept picture instead of re-drawing the figure from its layers, and has
	 * to know which of the two it is holding.
	 */
	public isRenderedPicture(url: string): boolean {
		return url.includes(RENDERED_FOLDER);
	}

	private renderedPath(uid: string): string {
		return `${RENDERED_FOLDER}/${uid}/${RENDERED_FILE}`;
	}

	/**
	 * The public download address of a stored file. Token-less, so it stands
	 * or falls on `storage.rules` — both folders are readable by anyone,
	 * which they have to be: an avatar shows up next to other collectors.
	 */
	private downloadUrl(path: string): string {
		const file = ref(this.storage, path);

		return (
			`https://firebasestorage.googleapis.com/v0/b/${file.bucket}` +
			`/o/${encodeURIComponent(file.fullPath)}?alt=media`
		);
	}
}
