/**
 * Prepares a shelf photo for the scan. Same job as `photo-file.ts` does for a
 * single sleeve, at a different resolution — and the difference matters.
 *
 * A sleeve fills the frame, so 1600px is plenty. A compartment holds a dozen
 * spines, and the catalog number on one of them is the smallest print in the
 * picture: at 1600px it is a few pixels tall and unreadable. The model accepts
 * a long edge of 2576px and downscales anything larger, so that is the most
 * the photo can carry — and for this picture it is worth paying for.
 *
 * https://platform.claude.com/docs/en/build-with-claude/vision — high-
 * resolution tier: 2576px long edge, 4784 visual tokens.
 */

import { ScanPhoto } from '@music-collection/api';

import { scaleImage } from '../../shared/image';

/**
 * The model's own long-edge limit; above it the image is downscaled anyway,
 * so sending more is upload time for nothing.
 */
const MAX_EDGE = 2576;

/**
 * Higher than the sleeve's 0.85: JPEG artefacts land on exactly the thin,
 * low-contrast spine lettering this scan depends on.
 */
const QUALITY = 0.92;

export interface PreparedShelfPhoto extends ScanPhoto {
	previewUrl: string;
	width: number;
	height: number;
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
export async function prepareShelfPhoto(
	file: Blob
): Promise<PreparedShelfPhoto> {
	const { blob, width, height } = await scaleImage(file, {
		maxEdge: MAX_EDGE,
		quality: QUALITY,
	});

	return {
		data: toBase64(await blob.arrayBuffer()),
		mediaType: 'image/jpeg',
		previewUrl: URL.createObjectURL(blob),
		width,
		height,
	};
}
