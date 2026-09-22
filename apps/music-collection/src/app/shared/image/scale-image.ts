/**
 * Scaling a picture a collector just chose down to something worth keeping.
 *
 * A phone camera gives 8-12 megapixels. Nothing in this app shows a picture
 * anywhere near that size, so the full file would cost upload time, storage
 * and — every time the page opens — the collector's own bandwidth, for
 * detail no screen renders. The long edge is what is limited, so a sleeve
 * photographed portrait or landscape comes out equally sharp.
 *
 * The decoding is the awkward part: an iPhone photo shared as a file keeps
 * HEIC, which only Safari reads, and some formats the browser can render it
 * cannot decode directly. Hence the three routes below, cheapest first.
 */

export interface ScaleOptions {
	/** Long edge in pixels; a smaller picture is left alone. */
	maxEdge: number;
	/** JPEG quality, 0-1. */
	quality: number;
}

export interface ScaledImage {
	blob: Blob;
	width: number;
	height: number;
}

function scaledSize(
	width: number,
	height: number,
	maxEdge: number
): [number, number] {
	const longest = Math.max(width, height);

	if (longest <= maxEdge) return [width, height];

	const ratio = maxEdge / longest;

	return [Math.round(width * ratio), Math.round(height * ratio)];
}

/**
 * Decodes through an `<img>`, which some browsers manage when the direct
 * route cannot. Safari reads HEIC this way — an iPhone photo shared as a file
 * keeps that format, and `createImageBitmap` refuses it.
 */
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
async function decodeHeic(file: Blob, quality: number): Promise<ImageBitmap> {
	const { heicTo } = await import('heic-to');

	return createImageBitmap(
		await heicTo({ blob: file, type: 'image/jpeg', quality })
	);
}

/**
 * The picture as something the canvas can draw, cheapest route first: the
 * direct decode handles JPEG and PNG, the element adds what the browser can
 * render but not decode, and the converter is the last resort.
 */
async function decode(
	file: Blob,
	quality: number
): Promise<ImageBitmap | HTMLImageElement> {
	try {
		return await createImageBitmap(file);
	} catch {
		try {
			return await decodeAsElement(file);
		} catch (error) {
			return decodeHeic(file, quality).catch(() => {
				throw error;
			});
		}
	}
}

/** The scaled picture as a JPEG. Throws when the file is not an image. */
export async function scaleImage(
	file: Blob,
	{ maxEdge, quality }: ScaleOptions
): Promise<ScaledImage> {
	const source = await decode(file, quality);
	const [width, height] = scaledSize(
		'width' in source ? source.width : 0,
		'height' in source ? source.height : 0,
		maxEdge
	);
	const canvas = document.createElement('canvas');

	canvas.width = width;
	canvas.height = height;
	canvas.getContext('2d')?.drawImage(source, 0, 0, width, height);

	if (source instanceof ImageBitmap) {
		source.close();
	}

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, 'image/jpeg', quality)
	);

	if (!blob) throw new Error('A kép feldolgozása nem sikerült.');

	return { blob, width, height };
}
