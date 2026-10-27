/**
 * Reads the EAN/UPC barcode off a photo with the browser's own decoder.
 *
 * When it works the scan needs no model at all, which is both free and more
 * accurate than reading the digits off the picture. Where the API is missing
 * (Firefox, older Safari) this returns `null` and the server falls back to
 * the model, which reads the digits itself — so nothing breaks, it just costs
 * a call.
 */

/** The barcode symbologies printed on records; the rest is noise here. */
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

interface DetectedBarcode {
	rawValue: string;
	format: string;
}

interface BarcodeDetectorApi {
	detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
	new (options?: { formats: string[] }): BarcodeDetectorApi;
	getSupportedFormats?(): Promise<string[]>;
}

const detector = (): BarcodeDetectorConstructor | null =>
	(globalThis as { BarcodeDetector?: BarcodeDetectorConstructor })
		.BarcodeDetector ?? null;

/** Whether this browser can decode barcodes itself. */
export const canDetectBarcode = (): boolean => !!detector();

/**
 * The barcode digits, or `null` when there is none, the browser cannot read
 * one, or decoding fails. Never throws: a missing barcode is an ordinary
 * outcome, not an error.
 */
export async function detectBarcode(image: Blob): Promise<string | null> {
	const BarcodeDetector = detector();

	if (!BarcodeDetector) return null;

	try {
		const supported =
			(await BarcodeDetector.getSupportedFormats?.()) ?? FORMATS;
		const formats = FORMATS.filter((format) => supported.includes(format));

		if (!formats.length) return null;

		const [found] = await new BarcodeDetector({ formats }).detect(image);
		const digits = found?.rawValue.replace(/\D+/g, '') ?? '';

		return digits.length >= 8 ? digits : null;
	} catch {
		return null;
	}
}
