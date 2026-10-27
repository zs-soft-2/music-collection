#!/usr/bin/env node
/**
 * Publishes the avatar wardrobe — the drawn garments, faces and hair the
 * profile's character is assembled from — to Cloud Storage.
 *
 *   node tools/avatar/upload-assets.mjs --source <dir> [--env dev|prod]
 *     [--width 768] [--version v1] [--confirm]
 *
 * `--source` is the folder the pictures were drawn into (the Metal Avatar
 * Forge's `assets`). They arrive as 1024×1536 webp, some 25 MB in all, and
 * are published at two sizes:
 *
 *   `avatar/{version}/`      `--width` (768) — the editor on a desktop, and
 *                            what the saved profile picture is rendered from
 *   `avatar/{version}/sm/`   `--small` (512) — the editor on a phone, where
 *                            the stage is at most 40dvh tall
 *
 * The small set is half the bytes and is what a phone actually draws: a
 * garment swapped there costs about 39 KB instead of 80. It is also cut at a
 * lower quality (72 against 80), which at that size is invisible — checked
 * side by side at 260 pixels tall on a doubled pixel density — and is most
 * of where the saving comes from, webp being far from linear in the pixels. The saved
 * picture is always rendered from the large set, because it crops to the
 * head and shoulders — some 60% of the frame — and a crop of the small set
 * would be soft. The thumbnails are already small and go as they are, into
 * the large folder only.
 *
 * The files are published with a cache header that never expires — which is
 * why the folder carries a version. A redrawn wardrobe goes up as `v2` and
 * the client is pointed at it (LAYER_FOLDER in avatar.repository.ts);
 * overwriting `v1` would leave every browser that has been here showing the
 * old garments.
 *
 * Needs `cwebp` (brew install webp) and Firebase Admin credentials
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default
 * login`). Without --confirm it only reports what it would upload.
 */

import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { promisify } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

import { ENV_OPTION, readEnvironment } from '../sync/environment.mjs';
import { size, unreadable } from './webp.mjs';

const run = promisify(execFile);

/**
 * What the whole wardrobe comes to. Asserted rather than assumed: the app
 * builds file names from the collector's choices (`allAvatarLayers` in
 * apps/music-collection/src/app/data/avatar/avatar.model.ts, whose test
 * checks the same number), so a missing file is a hole in a character
 * nobody would notice until somebody chose it.
 */
const EXPECTED_FILES = 296;

/** Thumbnails are 108×128 already; re-cutting them would only blur them. */
const AS_IS = /^thumb-/;

/**
 * How hard each set is squeezed. The small one takes the lower number: at
 * the size a phone draws it the difference cannot be seen, and it is where
 * most of the saving is.
 */
const LARGE_QUALITY = 80;
const SMALL_QUALITY = 72;

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		source: { type: 'string' },
		width: { type: 'string', default: '768' },
		small: { type: 'string', default: '512' },
		version: { type: 'string', default: 'v1' },
		confirm: { type: 'boolean', default: false },
	},
});

if (!options.source) {
	console.error(
		'--source is required: the folder the avatar pictures were drawn into'
	);
	process.exit(1);
}

const width = Number(options.width);
const small = Number(options.small);

for (const [name, value] of [
	['--width', width],
	['--small', small],
]) {
	if (!Number.isInteger(value) || value < 128 || value > 1024) {
		console.error(`${name} must be a whole number between 128 and 1024`);
		process.exit(1);
	}
}

if (small > width) {
	console.error('--small must not be larger than --width');
	process.exit(1);
}

const folder = `avatar/${options.version}`;
const { projectId, storageBucket } = await readEnvironment(options.env);
const files = (await readdir(options.source))
	.filter((name) => name.endsWith('.webp'))
	.sort();

console.log(
	`${projectId}: ${files.length} avatar layers → gs://${storageBucket}/${folder}` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to publish')
);

if (files.length !== EXPECTED_FILES) {
	console.warn(
		`expected ${EXPECTED_FILES} files, found ${files.length} — a look ` +
			`whose file is missing draws a hole`
	);
	process.exitCode = 1;
}

// Which of them are actually pictures. The drawing was done in batches over
// days and a few came out empty; converting one of those stops the whole run
// halfway through, so they are found first and named all at once.
const broken = [];
const sound = [];

for (const name of files) {
	const why = await unreadable(join(options.source, name));

	(why ? broken : sound).push(why ? `${name} (${why})` : name);
}

if (broken.length) {
	console.warn(
		`\n${broken.length} of ${files.length} are not pictures and are ` +
			`skipped — redraw them and run this again:`
	);
	broken.forEach((name) => console.warn(`  ${name}`));
	console.warn(
		'\nA collector who picks one of these sees the view they were ' +
			'looking at stay put, and is told the view is unavailable.\n'
	);
	process.exitCode = 1;
}

await assertCwebp();

const source = await total(options.source, sound);

console.log(`source: ${mb(source)} at 1024×1536`);

if (!options.confirm) {
	// Cutting one large file is enough to say what the whole set will come
	// to: they are the same pictures at the same size.
	const sample = sound.find((name) => !AS_IS.test(name));
	const work = await mkdtemp(join(tmpdir(), 'avatar-'));

	try {
		const before = await size(join(options.source, sample));
		const large = await size(
			await cut(options.source, sample, work, width, LARGE_QUALITY)
		);
		const little = await size(
			await cut(options.source, sample, work, small, SMALL_QUALITY, 'sm-')
		);

		console.log(
			`sample ${sample}: ${kb(before)} → ${kb(large)} at ${width}px, ` +
				`${kb(little)} at ${small}px`
		);
		console.log(
			`about ${mb((source * large) / before)} + ` +
				`${mb((source * little) / before)} small in all`
		);
	} finally {
		await rm(work, { recursive: true, force: true });
	}

	process.exit(process.exitCode ?? 0);
}

initializeApp({ credential: applicationDefault(), projectId, storageBucket });

const bucket = getStorage().bucket();

await ensureCors();

const work = await mkdtemp(join(tmpdir(), 'avatar-'));
let uploaded = 0;
let bytes = 0;

try {
	for (const name of sound) {
		bytes += await publish(name, `${folder}/${name}`, width, LARGE_QUALITY);

		// The thumbnails are 108×128 already and are only offered next to
		// the hair, at one size; a second copy of them would serve nobody.
		if (!AS_IS.test(name)) {
			bytes += await publish(
				name,
				`${folder}/sm/${name}`,
				small,
				SMALL_QUALITY,
				'sm-'
			);
		}

		uploaded += 1;

		if (uploaded % 25 === 0) {
			console.log(`  ${uploaded}/${sound.length}…`);
		}
	}
} finally {
	await rm(work, { recursive: true, force: true });
}

console.log(
	`published ${uploaded} layers at two sizes, ${mb(source)} → ${mb(bytes)}, ` +
		`${folder}/ and ${folder}/sm/`
);

/** Cuts one picture to a width and puts it where it belongs, returning bytes. */
async function publish(name, path, to, quality, prefix) {
	const content = await readFile(
		await cut(options.source, name, work, to, quality, prefix)
	);

	await bucket.file(path).save(content, {
		resumable: false,
		metadata: {
			contentType: 'image/webp',
			cacheControl: 'public, max-age=31536000, immutable',
		},
	});

	return content.length;
}

/** Re-cuts one picture, or copies it where it is small already. */
async function cut(from, name, into, to, quality, prefix = '') {
	const target = join(into, prefix + name);

	if (AS_IS.test(name)) {
		await run('cp', [join(from, name), target]);

		return target;
	}

	await run('cwebp', [
		'-quiet',
		'-resize',
		String(to),
		String(to * 1.5),
		'-q',
		String(quality),
		'-alpha_q',
		'90',
		join(from, name),
		'-o',
		target,
	]);

	return target;
}

async function assertCwebp() {
	try {
		await run('cwebp', ['-version']);
	} catch {
		console.error('cwebp not found — install it with: brew install webp');
		process.exit(1);
	}
}

async function total(dir, names) {
	const sizes = await Promise.all(names.map((name) => size(join(dir, name))));

	return sizes.reduce((sum, one) => sum + one, 0);
}

function kb(bytes) {
	return `${Math.round(bytes / 1024)} KB`;
}

function mb(bytes) {
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * The browser reads a layer back off a canvas to render the collector's
 * picture, which it may only do for an image served with CORS headers. The
 * bundle script sets the same rule; either may have done it already.
 */
async function ensureCors() {
	const [metadata] = await bucket.getMetadata();
	const allowsGet = (metadata.cors ?? []).some(
		(rule) => rule.origin?.includes('*') && rule.method?.includes('GET')
	);

	if (!allowsGet) {
		await bucket.setCorsConfiguration([
			...(metadata.cors ?? []),
			{ origin: ['*'], method: ['GET'], maxAgeSeconds: 3600 },
		]);
		console.log('bucket CORS: GET allowed from any origin');
	}
}
