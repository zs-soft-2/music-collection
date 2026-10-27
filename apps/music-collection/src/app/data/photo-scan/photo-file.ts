/**
 * Prepares a photo for the scan: scales it down and encodes it as JPEG.
 *
 * The identifiers on a sleeve are legible well below what a phone camera
 * gives, and the smaller image saves both upload time and tokens. The
 * scaling itself is the shared one — a copy photo is prepared the same way,
 * only larger.
 */

import { ScanPhoto } from '@music-collection/api';

import { scaleImage } from '../../shared/image';

/** Long edge in pixels; beyond this the recognition does not improve. */
const MAX_EDGE = 1600;
const QUALITY = 0.85;

export interface PreparedPhoto extends ScanPhoto {
	/** The scaled image, for the barcode decoder and the preview. */
	blob: Blob;
	previewUrl: string;
}

function toBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';

	// Chunked: `apply` on a megabyte-long array overflows the call stack.
	for (let index = 0; index < bytes.length; index += 8192) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
	}

	return btoa(binary);
}

/** The scaled photo, ready to send. Throws when the file is not an image. */
export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
	const { blob } = await scaleImage(file, {
		maxEdge: MAX_EDGE,
		quality: QUALITY,
	});

	return {
		data: toBase64(await blob.arrayBuffer()),
		mediaType: 'image/jpeg',
		blob,
		previewUrl: URL.createObjectURL(blob),
	};
}
