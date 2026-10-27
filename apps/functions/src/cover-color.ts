/**
 * A borítók színe, a borítókból.
 *
 * A `rich` kontextusszinten a zománc nem a műfajcsaládtól kapja a színét,
 * hanem attól, ahogyan ez a lemezsor néz ki a polcon. Ehhez a képet meg kell
 * nézni, és itt nem segít se modell, se szolgáltatás: egy átlagszínért nem
 * küldünk képet a gatewaynek, mert az egy hívásnyi pénz olyasmiért, amit egy
 * ciklus kiszámol.
 *
 * Ezért van itt kézi dekódolás. A JPEG-et a `jpeg-js` bontja ki — a borítók
 * túlnyomó része az, a Discogs és a Spotify is azt ad —, a PNG-t a Node saját
 * `zlib`-je plusz az itteni szűrő-visszafejtés. Amit nem ismerünk föl (WebP,
 * AVIF, átlapolt PNG), az nem hiba: `null` jön vissza, és a zománc marad a
 * műfajé. Egy jelvény nem múlhat azon, milyen formátumban töltött föl valaki
 * egy borítót.
 *
 * Amit a modul szándékosan NEM csinál: nem ír, nem naplóz és nem dob. A hívó
 * egy színt kér; ha nincs, azt kapja vissza, hogy nincs.
 */

import { inflateSync } from 'node:zlib';

import { decode as decodeJpeg } from 'jpeg-js';

import { Rgb } from './music-collection-badge-context';

/** Ennél nagyobb képet nem töltünk le egy színért. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** Ennyi képpontból már pontosan látszik egy borító színe. */
const MAX_SAMPLES = 12_000;
/** Ennyi borítót nézünk meg egy collectionből. */
export const MAX_COVERS = 4;
/** A `jpeg-js` korlátai, hogy egy rossz fájl ne vigye el a function memóriáját. */
const MAX_MEGAPIXELS = 32;
const MAX_DECODE_MEMORY_MB = 192;

/** A `fetch` annyija, amennyit használunk — a teszt ezt cseréli. */
export type FetchLike = (url: string) => Promise<{
	ok: boolean;
	arrayBuffer(): Promise<ArrayBuffer>;
}>;

const PNG_SIGNATURE = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** Hány bájt egy képpont a PNG színtípusában, 8 bites mintáknál. */
const PNG_CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** Ennél áttetszőbb képpont nem a borító színe, hanem a mögötte lévőé. */
const MIN_ALPHA = 128;

interface PngHeader {
	width: number;
	height: number;
	bitDepth: number;
	colorType: number;
	interlace: number;
}

/**
 * A Paeth-előrejelző a PNG-szabványból. A bal, a fölső és az átlós közül az,
 * amelyik a becsléshez a legközelebb esik.
 */
function paeth(left: number, above: number, corner: number): number {
	const estimate = left + above - corner;
	const fromLeft = Math.abs(estimate - left);
	const fromAbove = Math.abs(estimate - above);
	const fromCorner = Math.abs(estimate - corner);

	if (fromLeft <= fromAbove && fromLeft <= fromCorner) {
		return left;
	}

	return fromAbove <= fromCorner ? above : corner;
}

/** Egy sor visszafejtése a szűrője szerint, helyben. */
function unfilter(
	line: Buffer,
	previous: Buffer,
	filter: number,
	pixelBytes: number
): void {
	for (let index = 0; index < line.length; index += 1) {
		const left = index >= pixelBytes ? line[index - pixelBytes] : 0;
		const above = previous[index];
		const corner = index >= pixelBytes ? previous[index - pixelBytes] : 0;
		let addend = 0;

		if (filter === 1) {
			addend = left;
		} else if (filter === 2) {
			addend = above;
		} else if (filter === 3) {
			addend = (left + above) >> 1;
		} else if (filter === 4) {
			addend = paeth(left, above, corner);
		}

		line[index] = (line[index] + addend) & 0xff;
	}
}

/** A PNG fejléce, palettája és tömörített képadata, egy végigolvasással. */
function readPngChunks(bytes: Buffer): {
	header: PngHeader | null;
	palette: Buffer | null;
	data: Buffer[];
} {
	let offset = 8;
	let header: PngHeader | null = null;
	let palette: Buffer | null = null;
	const data: Buffer[] = [];

	while (offset + 8 <= bytes.length) {
		const length = bytes.readUInt32BE(offset);
		const type = bytes.toString('ascii', offset + 4, offset + 8);
		const start = offset + 8;
		const end = start + length;

		if (end > bytes.length || type === 'IEND') {
			break;
		}

		if (type === 'IHDR' && length >= 13) {
			header = {
				width: bytes.readUInt32BE(start),
				height: bytes.readUInt32BE(start + 4),
				bitDepth: bytes[start + 8],
				colorType: bytes[start + 9],
				interlace: bytes[start + 12],
			};
		} else if (type === 'PLTE') {
			palette = bytes.subarray(start, end);
		} else if (type === 'IDAT') {
			data.push(bytes.subarray(start, end));
		}

		// A darab végén négy bájt CRC, amit nem ellenőrzünk: egy sérült
		// borító legrosszabb esetben rossz színt ad, és azt is csak egyszer.
		offset = end + 4;
	}

	return { header, palette, data };
}

/**
 * Képpontok egy PNG-ből. `null`, amit nem ismerünk: 8 bitesnél más minta,
 * átlapolt kép, vagy paletta nélküli palettás kép.
 */
function samplePng(bytes: Buffer): Rgb[] | null {
	const { header, palette, data } = readPngChunks(bytes);

	if (
		!header ||
		header.bitDepth !== 8 ||
		header.interlace !== 0 ||
		!PNG_CHANNELS[header.colorType] ||
		(header.colorType === 3 && !palette) ||
		!data.length
	) {
		return null;
	}

	const pixelBytes = PNG_CHANNELS[header.colorType];
	const stride = header.width * pixelBytes;
	let raw: Buffer;

	try {
		raw = inflateSync(Buffer.concat(data));
	} catch {
		return null;
	}

	if (raw.length < (stride + 1) * header.height) {
		return null;
	}

	const step = Math.max(
		1,
		Math.floor((header.width * header.height) / MAX_SAMPLES)
	);
	const samples: Rgb[] = [];
	let previous = Buffer.alloc(stride);

	for (let row = 0; row < header.height; row += 1) {
		const at = row * (stride + 1);
		const line = Buffer.from(raw.subarray(at + 1, at + 1 + stride));

		unfilter(line, previous, raw[at], pixelBytes);
		previous = line;

		// A mintavétel a kép egészén lépdel végig, nem soronként újraindulva:
		// különben egy magas, keskeny képen minden sor első képpontja jönne.
		const first = (step - ((row * header.width) % step)) % step;

		for (let column = first; column < header.width; column += step) {
			const index = column * pixelBytes;

			if (header.colorType === 3) {
				const entry = line[index] * 3;

				samples.push({
					red: (palette as Buffer)[entry] ?? 0,
					green: (palette as Buffer)[entry + 1] ?? 0,
					blue: (palette as Buffer)[entry + 2] ?? 0,
				});
			} else if (header.colorType === 0 || header.colorType === 4) {
				if (header.colorType === 4 && line[index + 1] < MIN_ALPHA) {
					continue;
				}

				samples.push({
					red: line[index],
					green: line[index],
					blue: line[index],
				});
			} else {
				if (header.colorType === 6 && line[index + 3] < MIN_ALPHA) {
					continue;
				}

				samples.push({
					red: line[index],
					green: line[index + 1],
					blue: line[index + 2],
				});
			}
		}
	}

	return samples.length ? samples : null;
}

/** Képpontok egy JPEG-ből. */
function sampleJpeg(bytes: Buffer): Rgb[] | null {
	let image;

	try {
		image = decodeJpeg(bytes, {
			useTArray: true,
			formatAsRGBA: true,
			tolerantDecoding: true,
			maxResolutionInMP: MAX_MEGAPIXELS,
			maxMemoryUsageInMB: MAX_DECODE_MEMORY_MB,
		});
	} catch {
		return null;
	}

	const total = image.width * image.height;
	const step = Math.max(1, Math.floor(total / MAX_SAMPLES));
	const samples: Rgb[] = [];

	for (let pixel = 0; pixel < total; pixel += step) {
		const index = pixel * 4;

		if (image.data[index + 3] < MIN_ALPHA) {
			continue;
		}

		samples.push({
			red: image.data[index],
			green: image.data[index + 1],
			blue: image.data[index + 2],
		});
	}

	return samples.length ? samples : null;
}

/** Képpontok egy képfájlból, a fájl első bájtjai szerint. */
export function sampleImage(bytes: Buffer): Rgb[] | null {
	if (bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
		return samplePng(bytes);
	}

	if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
		return sampleJpeg(bytes);
	}

	return null;
}

/** Ennyire telt képpont mond színt; ami ez alatt van, az szürke. */
const MIN_SPAN = 46;
/** A majdnem feketét és a majdnem fehéret nem a színe teszi azzá. */
const MIN_LEVEL = 30;
const MAX_LEVEL = 247;
/** Ennyi fokos szeletekben számoljuk a színeket. */
const HUE_BUCKET = 30;
const HUE_BUCKETS = 360 / HUE_BUCKET;

function hueOf(color: Rgb, max: number, span: number): number {
	let hue: number;

	if (max === color.red) {
		hue = ((color.green - color.blue) / span) % 6;
	} else if (max === color.green) {
		hue = (color.blue - color.red) / span + 2;
	} else {
		hue = (color.red - color.green) / span + 4;
	}

	return (hue * 60 + 360) % 360;
}

/**
 * A minták uralkodó színe.
 *
 * Nem átlag: egy borító átlaga majdnem mindig ugyanaz a sáros barna, akármi
 * van rajta. Ehelyett a telt képpontok színkör-szelet szerint szavaznak, és a
 * nyertes szelet saját átlaga jön vissza — így egy fekete borítón futó
 * vérvörös felirat is meg tudja nyerni a szavazást, pedig a kép nagy része
 * fekete.
 *
 * Ha egyetlen telt képpont sincs, a sima átlag jön: egy fekete-fehér borító
 * világosságáról így is igazat mond, és a hívó abból szürke vagy csontfehér
 * zománcot csinál.
 */
export function dominantColor(samples: Rgb[]): Rgb | null {
	if (!samples.length) {
		return null;
	}

	const weights = new Array<number>(HUE_BUCKETS).fill(0);
	const sums = Array.from({ length: HUE_BUCKETS }, () => ({
		red: 0,
		green: 0,
		blue: 0,
	}));
	const plain = { red: 0, green: 0, blue: 0 };

	for (const color of samples) {
		plain.red += color.red;
		plain.green += color.green;
		plain.blue += color.blue;

		const max = Math.max(color.red, color.green, color.blue);
		const min = Math.min(color.red, color.green, color.blue);
		const span = max - min;

		if (span < MIN_SPAN || max < MIN_LEVEL || max > MAX_LEVEL) {
			continue;
		}

		const bucket = Math.floor(hueOf(color, max, span) / HUE_BUCKET);

		// A telítettség a súly: egy tompa pasztell szavazata ne érjen annyit,
		// mint egy tiszta vörösé.
		weights[bucket] += span;
		sums[bucket].red += color.red * span;
		sums[bucket].green += color.green * span;
		sums[bucket].blue += color.blue * span;
	}

	const best = weights.indexOf(Math.max(...weights));

	if (weights[best] <= 0) {
		return {
			red: Math.round(plain.red / samples.length),
			green: Math.round(plain.green / samples.length),
			blue: Math.round(plain.blue / samples.length),
		};
	}

	return {
		red: Math.round(sums[best].red / weights[best]),
		green: Math.round(sums[best].green / weights[best]),
		blue: Math.round(sums[best].blue / weights[best]),
	};
}

/**
 * A borítók közös uralkodó színe.
 *
 * Több borító, egy szavazás: a lemezek képpontjai egy közös urnába kerülnek,
 * mert a collection színe az, ami a sorozaton végigmegy, nem az, ami az első
 * lemezen van. Egy letölthetetlen vagy ismeretlen formátumú borító kimarad,
 * és nem állítja meg a többit.
 */
export async function readCoverColor(
	urls: string[],
	fetchImpl: FetchLike = fetch
): Promise<Rgb | null> {
	const samples: Rgb[] = [];

	for (const url of urls.slice(0, MAX_COVERS)) {
		try {
			const response = await fetchImpl(url);

			if (!response.ok) {
				continue;
			}

			const bytes = Buffer.from(await response.arrayBuffer());

			if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
				continue;
			}

			samples.push(...(sampleImage(bytes) ?? []));
		} catch {
			// A borító nem elérhető, vagy nem is kép. A jelvény ettől még
			// elkészül, csak a műfaj színével.
			continue;
		}
	}

	return dominantColor(samples);
}
