/**
 * Checks that the `script-src` hashes in `firebase.json` still match what the
 * build actually put into `index.html`.
 *
 * The hosting headers carry a strict CSP, and a static site has no per-request
 * nonce to hand out: the two inline things on the page are allowed by their
 * SHA-256 instead — the theme script of `index.html`, and the
 * `onload="this.media='all'"` attribute that the inline-critical-CSS step
 * (beasties) writes onto the stylesheet link.
 *
 * A hash that falls out of step fails silently in the browser, and in the two
 * worst possible ways: the theme flashes the dark page before the light one,
 * or the stylesheet stays `media="print"` and the app is drawn with no styles
 * at all. Neither shows up in a build log, so it is checked here instead —
 * after the build, before the deploy (`npm run build:prod`, CI).
 *
 * The check runs in both directions: every inline script and handler of the
 * built page has to be in the policy, and every hash in the policy has to
 * belong to something on the page.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG = join(ROOT, 'firebase.json');

/** `<script>` without a `src`: the inline ones. */
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
/**
 * `onload="…"`, `onerror='…'`: the inline event handlers. The pattern is wide
 * on purpose — an attribute like `once="…"` would be reported here although
 * the browser never runs it, and a false alarm is loud, while a handler
 * missed would be silent.
 */
const EVENT_HANDLER = /\son[a-z]+=(?:"([^"]*)"|'([^']*)')/g;

function sha256(source) {
	return `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`;
}

/** The directive's source list, or null when the policy has no such directive. */
function directive(policy, name) {
	const found = policy
		.split(';')
		.map((part) => part.trim())
		.find((part) => part === name || part.startsWith(`${name} `));

	return found ? found.slice(name.length).trim().split(/\s+/) : null;
}

const config = JSON.parse(await readFile(CONFIG, 'utf8'));
const hosting = config.hosting.find((target) => target.public);
const policy = hosting?.headers
	?.flatMap((rule) => rule.headers)
	.find((header) => header.key === 'Content-Security-Policy')?.value;

if (!policy) {
	console.error(
		`No Content-Security-Policy in the hosting headers of ${CONFIG} — the inline hashes cannot be checked.`
	);
	process.exit(1);
}

const index = join(ROOT, hosting.public, 'index.html');
let html;

try {
	html = await readFile(index, 'utf8');
} catch {
	console.error(
		`${index} is missing — build the app before checking the policy (npm run build:dev).`
	);
	process.exit(1);
}

const sources = directive(policy, 'script-src') ?? [];
const allowed = new Set(
	sources.filter((source) => source.startsWith("'sha256-"))
);
const problems = [];

if (sources.includes("'unsafe-inline'")) {
	problems.push(
		"script-src carries 'unsafe-inline', which lets any injected script run: the hashes below then guard nothing."
	);
}

/** Everything inline on the built page, with what it takes to allow it. */
const inline = [
	...[...html.matchAll(INLINE_SCRIPT)].map((match) => ({
		what: 'inline <script>',
		source: match[1],
		needsUnsafeHashes: false,
	})),
	...[...html.matchAll(EVENT_HANDLER)].map((match) => ({
		what: `inline handler ${JSON.stringify(match[1] ?? match[2])}`,
		source: match[1] ?? match[2],
		needsUnsafeHashes: true,
	})),
];

const used = new Set();

for (const { what, source, needsUnsafeHashes } of inline) {
	const hash = sha256(source);

	used.add(hash);

	if (!allowed.has(hash)) {
		problems.push(
			`${what} is not allowed by script-src. Add ${hash} to the policy in firebase.json.`
		);

		continue;
	}

	if (needsUnsafeHashes && !sources.includes("'unsafe-hashes'")) {
		problems.push(
			`${what} is hashed in the policy, but an event handler also needs 'unsafe-hashes' in script-src.`
		);
	}
}

for (const hash of allowed) {
	if (!used.has(hash)) {
		problems.push(
			`script-src allows ${hash}, which nothing on the built page matches any more — remove it, or find what stopped matching. (A \`development\` build has no inline critical CSS, so check an optimized one: npm run build:dev.)`
		);
	}
}

if (problems.length) {
	console.error('The hosting CSP and the built index.html disagree:\n');

	for (const problem of problems) {
		console.error(`  - ${problem}`);
	}

	console.error(
		'\nThe browser would fail silently on this (no styles, or a theme flash), so the build stops here.'
	);
	process.exit(1);
}

console.log(
	`The hosting CSP matches the built page: ${inline.length} inline ${
		inline.length === 1 ? 'thing' : 'things'
	} hashed, nothing left over.`
);
