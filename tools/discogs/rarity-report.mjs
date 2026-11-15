#!/usr/bin/env node
/**
 * How rare the catalog's pressings are, by Discogs's count — the report the
 * rarity thresholds are set from.
 *
 *   node tools/discogs/rarity-report.mjs [--env dev|prod] [--sample 300]
 *
 * Read-only: it reads pressings from Firestore and asks Discogs how many of
 * its collectors hold each one (`community.have`). Nothing is written, and
 * no price is read — rarity counts copies, never money.
 *
 * It prints, per medium, how the pressings fall into the five tiers with the
 * thresholds as they stand (`apps/functions/src/release-rarity.ts`), and the
 * thresholds that would give the split the docs aim for (Q-SCORE-002): about
 * 60% common, 20% uncommon, 12% rare, 6% very rare, 2% ultra rare.
 *
 * A token (DISCOGS_TOKEN) more than doubles the pace: 60 requests a minute
 * rather than 25. `--sample` caps the pressings asked about per medium.
 * Needs Firebase Admin credentials (GOOGLE_APPLICATION_CREDENTIALS or
 * `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { ENV_OPTION, readEnvironment } from '../sync/environment.mjs';
import { DiscogsClient } from './discogs-client.mjs';

/** As `RARITY_THRESHOLDS.have` in apps/functions/src/release-rarity.ts. */
const THRESHOLDS = { ultraRare: 25, veryRare: 100, rare: 300, uncommon: 1000 };
/** The share of pressings each tier is meant to hold, the rarest first. */
const TARGET = { ultraRare: 0.02, veryRare: 0.06, rare: 0.12, uncommon: 0.2 };
const TIERS = ['ultraRare', 'veryRare', 'rare', 'uncommon', 'common'];

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		sample: { type: 'string', default: '300' },
	},
});

const sample = Number(options.sample);

if (!Number.isSafeInteger(sample) || sample <= 0) {
	console.error('--sample must be a positive whole number');
	process.exit(1);
}

function tierOf(have) {
	return (
		TIERS.find((tier) => tier !== 'common' && have < THRESHOLDS[tier]) ??
		'common'
	);
}

/**
 * The thresholds that would put the target share into each tier: the count
 * below which that share of this medium's pressings falls.
 */
function calibrated(haves) {
	const sorted = [...haves].sort((a, b) => a - b);
	const cuts = {};
	let share = 0;

	for (const tier of TIERS.slice(0, -1)) {
		share += TARGET[tier];
		cuts[tier] =
			sorted[
				Math.min(sorted.length - 1, Math.floor(sorted.length * share))
			];
	}

	return cuts;
}

const percent = (part, whole) =>
	`${((part / whole) * 100).toFixed(1).padStart(5)}%`;

const { projectId } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId });

const client = new DiscogsClient();
const releases = await getFirestore().collectionGroup('release').get();
/** medium → the pressings of it that have a Discogs page. */
const byMedia = new Map();
const seen = new Set();

for (const document of releases.docs) {
	const { discogsReleaseId, generic, media, uid } = document.data();

	// A pressing can live in two places; count it once.
	if (!discogsReleaseId || generic || seen.has(uid ?? document.id)) {
		continue;
	}

	seen.add(uid ?? document.id);
	byMedia.set(media, [...(byMedia.get(media) ?? []), discogsReleaseId]);
}

console.log(
	`${projectId}: ${seen.size} pressings with a Discogs page of ${releases.size}` +
		(client.authenticated
			? ''
			: ' — no DISCOGS_TOKEN, 25 requests a minute')
);

for (const [media, ids] of byMedia) {
	const asked = ids.slice(0, sample);
	const haves = [];

	for (const id of asked) {
		try {
			const have = (await client.get(`/releases/${id}`))?.community?.have;

			if (typeof have === 'number') {
				haves.push(have);
			}
		} catch (error) {
			console.error(`  ${id}: ${error.message}`);
		}
	}

	if (!haves.length) {
		console.log(`\n${media}: no counts`);
		continue;
	}

	const counts = Object.fromEntries(TIERS.map((tier) => [tier, 0]));

	for (const have of haves) {
		counts[tierOf(have)] += 1;
	}

	const cuts = calibrated(haves);

	console.log(
		`\n${media}: ${haves.length} of ${ids.length} pressings asked about`
	);

	for (const tier of TIERS) {
		console.log(
			`  ${tier.padEnd(10)} ${percent(counts[tier], haves.length)}` +
				(tier === 'common'
					? ''
					: `   now: have < ${String(THRESHOLDS[tier]).padEnd(5)}` +
						` for the target: have < ${cuts[tier]}`)
		);
	}
}
