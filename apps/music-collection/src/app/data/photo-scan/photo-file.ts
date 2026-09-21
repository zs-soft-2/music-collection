/**
 * Prepares a photo for the scan: scales it down and encodes it as JPEG.
 *
 * A phone camera gives 8-12 megapixels; the identifiers are legible well
 * below that, and the smaller image saves both upload time and tokens. The
 * long edge is the limit, so a sleeve photographed portrait or landscape ends
 * up equally readable.
 */

import { ScanPhoto } from '@music-collection/api';

/** Long edge in pixels; beyond this the recognition does not improve. */
const MAX_EDGE = 1600;
const QUALITY = 0.85;

export interface PreparedPhoto extends ScanPhoto {
	/** The scaled image, for the barcode decoder and the preview. */
	blob: Blob;
	previewUrl: string;
}

function scaledSize(width: number, height: number): [number, number] {
	const longest = Math.max(width, height);

	if (longest <= MAX_EDGE) return [width, height];

	const ratio = MAX_EDGE / longest;

	return [Math.round(width * ratio), Math.round(height * ratio)];
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

/** Decodes through an `<img>`, which some browsers manage when the direct
 * route cannot. Safari reads HEIC this way — an iPhone photo shared as a file
 * keeps that format, and `createImageBitmap` refuses it. */
function decodeAsElement(file: Blob): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();

		image.onload = () => {
			URL.revokeObjectURL(url);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('The browser cannot read this image format.'));
		};
		image.src = url;
	});
}

/**
 * HEIC, the format an iPhone photo keeps when it is shared as a file. Only
 * Safari reads it on its own, so everywhere else it goes through libheif —
 * loaded here and not with the page, because it weighs more than the rest of
 * this route put together and an ordinary JPEG never needs it.
 */
async function decodeHeic(file: Blob): Promise<ImageBitmap> {
	const { heicTo } = await import('heic-to');

	return createImageBitmap(
		await heicTo({ blob: file, type: 'image/jpeg', quality: QUALITY })
	);
}

/**
 * The picture as something the canvas can draw, cheapest route first: the
 * direct decode handles JPEG and PNG, the element adds what the browser can
 * render but not decode, and the converter is the last resort.
 */
async function decode(
	file: Blob
): Promise<ImageBitmap | HTMLImageElement> {
	try {
		return await createImageBitmap(file);
	} catch {
		try {
			return await decodeAsElement(file);
		} catch (error) {
			return decodeHeic(file).catch(() => {
				throw error;
			});
		}
	}
}

/** The scaled photo, ready to send. Throws when the file is not an image. */
export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
	const source = await decode(file);
	const [width, height] = scaledSize(
		'width' in source ? source.width : 0,
		'height' in source ? source.height : 0
	);
	const canvas = document.createElement('canvas');

	canvas.width = width;
	canvas.height = height;
	canvas.getContext('2d')?.drawImage(source, 0, 0, width, height);

	if (source instanceof ImageBitmap) {
		source.close();
	}

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, 'image/jpeg', QUALITY)
	);

	if (!blob) throw new Error('A kép feldolgozása nem sikerült.');

	return {
		data: toBase64(await blob.arrayBuffer()),
		mediaType: 'image/jpeg',
		blob,
		previewUrl: URL.createObjectURL(blob),
	};
}
