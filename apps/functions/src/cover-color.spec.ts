import { deflateSync } from 'node:zlib';

import { encode as encodeJpeg } from 'jpeg-js';

import { dominantColor, readCoverColor, sampleImage } from './cover-color';

// ── PNG-építő ─────────────────────────────────────────────────────────────
//
// Nincs PNG-kódoló a functions függőségei között, és nem is kell: a
// dekódolónk nyolc bites, nem átlapolt képeket olvas, és egy ilyet néhány
// sorból össze lehet rakni. A CRC-t a dekódoló nem nézi, ezért itt nulla.

function chunk(type: string, body: Buffer): Buffer {
	const header = Buffer.alloc(8);

	header.writeUInt32BE(body.length, 0);
	header.write(type, 4, 'ascii');

	return Buffer.concat([header, body, Buffer.alloc(4)]);
}

/** Igazszínű PNG, soronként megadható szűrővel. */
function png(
	width: number,
	height: number,
	pixel: (x: number, y: number) => [number, number, number],
	filter = 0
): Buffer {
	const stride = width * 3;
	const raw = Buffer.alloc((stride + 1) * height);

	for (let y = 0; y < height; y += 1) {
		const at = y * (stride + 1);

		raw[at] = filter;

		for (let x = 0; x < width; x += 1) {
			const current = pixel(x, y);
			// Up-szűrőnél a sorban a fölötte lévőtől vett különbség áll.
			const above = filter === 2 && y > 0 ? pixel(x, y - 1) : [0, 0, 0];

			for (let channel = 0; channel < 3; channel += 1) {
				raw[at + 1 + x * 3 + channel] =
					(current[channel] - above[channel]) & 0xff;
			}
		}
	}

	const header = Buffer.alloc(13);

	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8;
	header[9] = 2;

	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0)),
	]);
}

function jpeg(
	width: number,
	height: number,
	pixel: (x: number, y: number) => [number, number, number]
): Buffer {
	const data = Buffer.alloc(width * height * 4);

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const [red, green, blue] = pixel(x, y);
			const at = (y * width + x) * 4;

			data[at] = red;
			data[at + 1] = green;
			data[at + 2] = blue;
			data[at + 3] = 255;
		}
	}

	return Buffer.from(encodeJpeg({ width, height, data }, 92).data);
}

const RED: [number, number, number] = [200, 20, 20];
const BLACK: [number, number, number] = [10, 10, 10];

function response(body: Buffer, ok = true) {
	return Promise.resolve({
		ok,
		arrayBuffer: () =>
			Promise.resolve(
				body.buffer.slice(
					body.byteOffset,
					body.byteOffset + body.byteLength
				) as ArrayBuffer
			),
	});
}

describe('a képek olvasása', () => {
	it('kiolvassa egy egyszínű PNG színét', () => {
		const color = dominantColor(sampleImage(png(16, 16, () => RED)) ?? []);

		expect(color?.red).toBeGreaterThan(180);
		expect(color?.blue).toBeLessThan(60);
	});

	it('az Up-szűrős sorokat is visszafejti', () => {
		const color = dominantColor(
			sampleImage(png(16, 16, () => RED, 2)) ?? []
		);

		expect(color?.red).toBeGreaterThan(180);
		expect(color?.blue).toBeLessThan(60);
	});

	it('kiolvassa egy JPEG színét', () => {
		const color = dominantColor(sampleImage(jpeg(32, 32, () => RED)) ?? []);

		expect(color?.red).toBeGreaterThan(170);
		expect(color?.blue).toBeLessThan(70);
	});

	it('nem ismeri fel, ami nem kép', () => {
		expect(sampleImage(Buffer.from('nem kép, csak szöveg'))).toBeNull();
	});

	it('a csonka PNG-n nem dob, csak hallgat', () => {
		const truncated = png(8, 8, () => RED).subarray(0, 40);

		expect(sampleImage(truncated)).toBeNull();
	});
});

describe('az uralkodó szín', () => {
	it('a kisebbségben lévő színt választja a fekete többség helyett', () => {
		// Ez az a döntés, amiért nem átlagot számolunk: egy fekete borítón
		// futó vérvörös csík színe a borító színe, az átlaga viszont barna.
		const cover = png(40, 40, (_x, y) => (y % 10 === 0 ? RED : BLACK));
		const color = dominantColor(sampleImage(cover) ?? []);

		expect(color?.red).toBeGreaterThan(150);
		expect(color?.green).toBeLessThan(80);
	});

	it('fekete-fehér borítón a világosságot adja vissza', () => {
		const color = dominantColor(
			sampleImage(png(16, 16, () => [60, 60, 60])) ?? []
		);

		expect(color).toEqual({ red: 60, green: 60, blue: 60 });
	});

	it('minta nélkül nincs szín', () => {
		expect(dominantColor([])).toBeNull();
	});
});

describe('a borítók színe', () => {
	it('átugorja az elérhetetlen borítót, és a többiből dolgozik', async () => {
		const color = await readCoverColor(['hiba', 'jó'], (url) =>
			url === 'hiba'
				? response(Buffer.alloc(0), false)
				: response(png(16, 16, () => RED))
		);

		expect(color?.red).toBeGreaterThan(180);
	});

	it('a dobó letöltést sem engedi a jelvény elé', async () => {
		const color = await readCoverColor(['robban'], () =>
			Promise.reject(new Error('hálózat'))
		);

		expect(color).toBeNull();
	});

	it('ismeretlen formátumból nem talál ki színt', async () => {
		const color = await readCoverColor(['webp'], () =>
			response(Buffer.from('RIFF....WEBP'))
		);

		expect(color).toBeNull();
	});
});
