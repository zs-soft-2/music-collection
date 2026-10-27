#!/usr/bin/env node
/**
 * Tries the shelf reading on real photos, without Firebase or a UI.
 *
 *   node tools/scan/try-shelf.mjs <image> [<second image>] [--media vinyl] [--json]
 *
 * Give it two photos of the same compartment, taken from different angles:
 * each one is read on its own, and the two readings are then merged, exactly
 * as the callable will do it. What it prints is the review table — the
 * conflicted fields are the ones the collector would have to look at.
 *
 * The key comes from `apps/functions/.secret.local` (GATEWAY_API_KEY), the
 * same file the emulator reads. No Discogs here: this step only reads the
 * spines, the pressings are looked up later, for the submitted rows only.
 *
 * The photos go up as they are: the model's API downscales anything longer than
 * 2576px on its long edge, which is exactly what the app sends after
 * `prepareShelfPhoto`, so what you see here is what the collector gets.
 *
 * Every run calls the model once per photo. Build the functions first
 * (`npm --prefix apps/functions run build`), since this loads `lib/`.
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
		media: { type: 'string' },
		json: { type: 'boolean', default: false },
	},
});

if (!positionals.length || positionals.length > 2) {
	console.error(
		'Usage: node tools/scan/try-shelf.mjs <image> [<second image>] [--media vinyl] [--json]'
	);
	process.exit(1);
}

const MEDIA_TYPES = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
};

const photos = positionals.map((path) => {
	const mediaType = MEDIA_TYPES[extname(path).toLowerCase()];

	if (!mediaType) {
		console.error(`Unsupported image: ${path} (jpg, png or webp)`);
		process.exit(1);
	}

	return { path, data: readFileSync(path).toString('base64'), mediaType };
});

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
		console.error(`No ${join(root, path)} — put GATEWAY_API_KEY there.`);
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

if (!gateway.apiKey) {
	console.error('GATEWAY_API_KEY is missing.');
	process.exit(1);
}

const { createVisionClient } = require('./lib/vision-client.js');
const {
	SHELF_REQUEST_TIMEOUT_MS,
	readShelfSignals,
	mergeShelfReads,
} = require('./lib/shelf-signals.js');

const client = createVisionClient(gateway, SHELF_REQUEST_TIMEOUT_MS);
const context = { media: options.media ?? null };
const started = Date.now();

// One request per photo, on purpose: two independent readings are what make
// the disagreement visible. Sent together, the model would reconcile them
// itself and hand back one confident answer.
const reads = await Promise.all(
	photos.map((photo) =>
		readShelfSignals(
			{ data: photo.data, mediaType: photo.mediaType },
			client,
			context
		)
	)
);

const merged = mergeShelfReads(reads);

if (options.json) {
	console.log(JSON.stringify({ reads, merged }, null, 2));
	process.exit(0);
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
const counted = merged.spineCounts.join(' and ');

console.log(
	`\n${photos.map((photo) => photo.path).join('\n')}\n` +
		`${seconds}s · ${photos.length} photo(s) · ${counted} spine(s) counted · ` +
		`${merged.spines.length} row(s)\n`
);

if (new Set(merged.spineCounts).size > 1) {
	console.log(
		'! the photos do not agree on how many records are in the compartment\n'
	);
}

const column = (value, width) =>
	String(value ?? '—')
		.padEnd(width)
		.slice(0, width);

console.log(
	`${'#'.padStart(3)}  ${column('artist', 22)} ${column('album', 30)} ` +
		`${column('catno', 14)} ${column('conf', 7)} seen`
);

for (const spine of merged.spines) {
	console.log(
		`${String(spine.position).padStart(3)}  ` +
			`${column(spine.unreadable ? '(unreadable)' : spine.artist, 22)} ` +
			`${column(spine.albumTitle, 30)} ` +
			`${column(spine.catalogNumber, 14)} ` +
			`${column(spine.confidence, 7)} ${spine.seenOn}/${photos.length}`
	);

	for (const field of spine.conflicts) {
		console.log(
			`     ↳ ${field}: "${spine[field]}" vs "${spine.alternatives[field]}"`
		);
	}
}

const conflicted = merged.spines.filter((spine) => spine.conflicts.length);
const unreadable = merged.spines.filter((spine) => spine.unreadable);

console.log(
	`\n${conflicted.length} row(s) need a look, ` +
		`${unreadable.length} unreadable, ` +
		`${merged.spines.length - conflicted.length - unreadable.length} agreed`
);
