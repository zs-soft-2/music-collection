#!/usr/bin/env node
/**
 * Archives the avatar wardrobe's masters — the 1024×1536 pictures the
 * garments were drawn as — to Cloud Storage, unchanged.
 *
 *   node tools/avatar/archive-source.mjs --source <dir> [--env dev|prod]
 *     [--version v1] [--confirm]
 *
 * Why this exists: `upload-assets.mjs` publishes the wardrobe at 768 and 512
 * pixels, and those cuts are all that Storage holds. The masters live in one
 * place only — the folder they were drawn into, in a checkout that does not
 * track them (the Metal Avatar Forge is deliberately kept out of git: 25 MB
 * of already-compressed webp in a public repo, for files no build needs).
 * Lose that folder and a `v2` — a wider cut, a better quality, a redraw of
 * the ten that came out empty — becomes impossible.
 *
 * The masters go up as they are, outside the `avatar/` prefix: everything
 * under that one is world-readable by design, and an archive has no reason
 * to be served. `archive/` falls to the catch-all in storage.rules, which is
 * ADMIN only.
 *
 * Each object carries what it is in its metadata, because a bucket path
 * alone will not say it in a year's time:
 *
 *   source    the tool the picture came out of
 *   wardrobe  the published version these are the masters of
 *   master    the real pixel size, read from the file's own header
 *   serves    the published object this one was cut into
 *   archived  the day it went up
 *
 * The count is not asserted here — `upload-assets.mjs` is where the wardrobe
 * is held to `allAvatarLayers()`. This script records what it actually found
 * in `manifest.json`, the empty files included, so a later redraw knows what
 * is missing without going back to the drawing folder.
 *
 * Needs Firebase Admin credentials (GOOGLE_APPLICATION_CREDENTIALS or
 * `gcloud auth application-default login`). Without --confirm it only
 * reports what it would archive.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

import { ENV_OPTION, readEnvironment } from '../sync/environment.mjs';
import { dimensions, size, unreadable } from './webp.mjs';

/**
 * Archive class: the masters are touched when a new wardrobe is cut, which
 * has happened once. At 25 MB every class costs the same rounding error, so
 * the class is here to say what the folder is for rather than to save money
 * — nothing should be serving from it. The manifest stays standard, being a
 * few hundred bytes that may well be read.
 */
const CLASS = 'ARCHIVE';

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		source: { type: 'string' },
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

const today = new Date().toISOString().slice(0, 10);
const folder = `archive/avatar-source/${options.version}`;
const { projectId, storageBucket } = await readEnvironment(options.env);
const files = (await readdir(options.source))
	.filter((name) => name.endsWith('.webp'))
	.sort();

console.log(
	`${projectId}: ${files.length} masters → gs://${storageBucket}/${folder}` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to archive')
);

// The drawing was done in batches over days and a few came out empty. They
// are no use in an archive, but which ones they are is: that list is the
// redraw list, so it is named here and kept in the manifest.
const masters = [];
const missing = [];

for (const name of files) {
	const why = await unreadable(join(options.source, name));

	if (why) {
		missing.push({ name, why });
		continue;
	}

	const path = join(options.source, name);
	const pixels = await dimensions(path);

	masters.push({ name, bytes: await size(path), pixels });
}

const bytes = masters.reduce((sum, one) => sum + one.bytes, 0);
const sizes = new Map();

for (const { pixels } of masters) {
	const key = pixels
		? `${pixels.width}×${pixels.height}`
		: 'unreadable header';

	sizes.set(key, (sizes.get(key) ?? 0) + 1);
}

console.log(`${masters.length} pictures, ${mb(bytes)}, as ${CLASS}`);

for (const [key, count] of [...sizes].sort((a, b) => b[1] - a[1])) {
	console.log(`  ${count} at ${key}`);
}

if (missing.length) {
	console.log(
		`\n${missing.length} of ${files.length} are not pictures and are ` +
			`left out — the redraw list, also written to manifest.json:`
	);
	missing.forEach(({ name, why }) => console.log(`  ${name} (${why})`));
}

if (!options.confirm) {
	console.log('\nnothing uploaded');
	process.exit(0);
}

initializeApp({ credential: applicationDefault(), projectId, storageBucket });

const bucket = getStorage().bucket();
let archived = 0;
let sent = 0;
let kept = 0;

for (const master of masters) {
	const file = bucket.file(`${folder}/${master.name}`);
	const [exists] = await file.exists();

	// A re-run should cost nothing. Same name, same length: the picture is
	// already up there, and the masters are never edited in place.
	if (exists) {
		const [metadata] = await file.getMetadata();

		if (Number(metadata.size) === master.bytes) {
			kept += 1;
			archived += 1;
			continue;
		}
	}

	await file.save(await readFile(join(options.source, master.name)), {
		resumable: false,
		metadata: {
			contentType: 'image/webp',
			cacheControl: 'private, max-age=0, no-store',
			storageClass: CLASS,
			metadata: {
				source: 'metal-avatar-forge',
				wardrobe: options.version,
				master: master.pixels
					? `${master.pixels.width}x${master.pixels.height}`
					: 'unknown',
				serves: `avatar/${options.version}/${master.name}`,
				archived: today,
			},
		},
	});

	sent += 1;
	archived += 1;

	if (archived % 25 === 0) {
		console.log(`  ${archived}/${masters.length}…`);
	}
}

const manifest = bucket.file(`${folder}/manifest.json`);

await manifest.save(
	JSON.stringify(
		{
			what:
				'The masters of the profile avatar wardrobe, as drawn: the ' +
				'pictures tools/avatar/upload-assets.mjs cuts to 768 and 512 ' +
				'pixels and publishes under avatar/' +
				options.version +
				'/. Not served from here.',
			source: 'Metal Avatar Forge / assets',
			wardrobe: options.version,
			archived: today,
			pictures: masters.length,
			bytes,
			sizes: Object.fromEntries(sizes),
			missing,
			recut: 'node tools/avatar/upload-assets.mjs --source <dir> --confirm',
		},
		null,
		'\t'
	) + '\n',
	{
		resumable: false,
		metadata: {
			contentType: 'application/json',
			cacheControl: 'private, max-age=0, no-store',
			metadata: {
				source: 'metal-avatar-forge',
				wardrobe: options.version,
				archived: today,
			},
		},
	}
);

// Said rather than assumed: the class travels in the same metadata as the
// tags, and a field the API quietly dropped would leave the archive sitting
// in standard storage without anybody noticing.
const [check] = await bucket.file(`${folder}/${masters[0].name}`).getMetadata();

console.log(
	`\narchived ${archived} masters (${sent} uploaded, ${kept} already up), ` +
		`${mb(bytes)} → ${folder}/`
);
console.log(
	`${masters[0].name}: ${check.storageClass}, tagged ` +
		Object.entries(check.metadata ?? {})
			.map(([key, value]) => `${key}=${value}`)
			.join(' ')
);

if (check.storageClass !== CLASS) {
	console.warn(
		`\nexpected ${CLASS} — the class did not take, the bytes are safe ` +
			`but they are in ${check.storageClass}`
	);
	process.exitCode = 1;
}

function mb(bytes) {
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
