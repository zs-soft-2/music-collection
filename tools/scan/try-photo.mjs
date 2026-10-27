#!/usr/bin/env node
/**
 * Tries the photo identification on a real picture, without Firebase.
 *
 *   node tools/scan/try-photo.mjs <image> [--album "Melissa"] [--artist "Mercyful Fate"]
 *     [--barcode 720642442524] [--json]
 *
 * It runs the same `scanPhoto` the callable runs, so what it prints is what
 * the collector would get. The tokens come from `apps/functions/.secret.local`
 * (GATEWAY_API_KEY, DISCOGS_TOKEN) — the same file the emulator reads.
 *
 * Every run calls the AI gateway and Discogs for real; the model call is
 * billed to the gateway tenant, about a cent.
 * Build the functions first (`npm --prefix apps/functions run build`), since
 * this loads the compiled `lib/`.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parseArgs } from 'node:util';

const root = new URL('../../', import.meta.url).pathname;
const require = createRequire(join(root, 'apps/functions/package.json'));

const { values: options, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		album: { type: 'string' },
		artist: { type: 'string' },
		barcode: { type: 'string' },
		json: { type: 'boolean', default: false },
	},
});

const [imagePath] = positionals;

if (!imagePath) {
	console.error(
		'Usage: node tools/scan/try-photo.mjs <image> [--album "…"] [--artist "…"] [--barcode …] [--json]'
	);
	process.exit(1);
}

const MEDIA_TYPES = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
};

const mediaType = MEDIA_TYPES[extname(imagePath).toLowerCase()];

if (!mediaType) {
	console.error(`Unsupported image: ${imagePath} (jpg, png or webp)`);
	process.exit(1);
}

/** KEY=value per line, no export, no quotes — the emulator's own format. */
function readKeyValues(relativePath) {
	const path = join(root, relativePath);
	const values = {};

	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const separator = line.indexOf('=');

		if (separator > 0 && !line.startsWith('#')) {
			values[line.slice(0, separator).trim()] = line
				.slice(separator + 1)
				.trim();
		}
	}

	return values;
}

/** The emulator's secret file. */
function readSecrets() {
	const path = 'apps/functions/.secret.local';

	try {
		return readKeyValues(path);
	} catch {
		console.error(`No ${join(root, path)} — put GATEWAY_API_KEY and DISCOGS_TOKEN there.`);
		process.exit(1);
	}
}

const secrets = readSecrets();
// The same two settings the deployed function reads: the key from Secret
// Manager (here `.secret.local`), the address from `.env.<project>` — the dev
// gateway unless GATEWAY_BASE_URL says otherwise.
const gateway = {
	apiKey: process.env.GATEWAY_API_KEY ?? secrets.GATEWAY_API_KEY,
	baseUrl:
		process.env.GATEWAY_BASE_URL ??
		readKeyValues('apps/functions/.env.music-collection-16676')
			.GATEWAY_BASE_URL,
};
const discogsToken = process.env.DISCOGS_TOKEN ?? secrets.DISCOGS_TOKEN;

if (!gateway.apiKey) {
	console.error('GATEWAY_API_KEY is missing.');
	process.exit(1);
}
if (!discogsToken) {
	console.error('DISCOGS_TOKEN is missing — /database/search needs it.');
	process.exit(1);
}

const { scanPhoto } = require('./lib/photo-scan.js');
const { PHOTO_REQUEST_TIMEOUT_MS } = require('./lib/photo-signals.js');
const { createVisionClient } = require('./lib/vision-client.js');

const image = readFileSync(imagePath);
const started = Date.now();

const result = await scanPhoto(
	{
		photo: { data: image.toString('base64'), mediaType },
		barcode: options.barcode ?? null,
		album: options.album
			? { name: options.album, artistName: options.artist ?? null }
			: null,
	},
	{
		client: createVisionClient(gateway, PHOTO_REQUEST_TIMEOUT_MS),
		discogs: { token: discogsToken },
	}
);

if (options.json) {
	console.log(JSON.stringify(result, null, 2));
	process.exit(0);
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);

console.log(`\n${imagePath} — ${seconds}s, model ${result.usedVision ? 'ran' : 'not needed'}\n`);

if (result.signals) {
	console.log('Read off the photo:');
	for (const [field, value] of Object.entries(result.signals)) {
		console.log(`  ${field.padEnd(15)} ${value ?? '—'}`);
	}
	console.log();
}

if (!result.candidates.length) {
	console.log('No candidate found.');
	process.exit(0);
}

console.log(`Candidates (${result.candidates.length}):`);
for (const candidate of result.candidates) {
	const where = candidate.discogsReleaseId
		? `release ${candidate.discogsReleaseId}`
		: `master ${candidate.discogsMasterId}`;

	console.log(
		`  [${candidate.match.padEnd(8)}] ${candidate.title} — ` +
			[
				candidate.formats.join(', '),
				candidate.label && `${candidate.label} (${candidate.catno ?? '?'})`,
				candidate.country,
				candidate.year,
			]
				.filter(Boolean)
				.join(' · ') +
			`  [${where}]`
	);
}
