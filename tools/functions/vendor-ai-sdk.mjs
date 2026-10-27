#!/usr/bin/env node
/**
 * Lehozza a @zssz-soft/zs-ai-sdk tarballját az `apps/functions/vendor/` alá.
 *
 *   node tools/functions/vendor-ai-sdk.mjs
 *
 * A functions a csomagot `file:vendor/…tgz`-ként függi, nem a registryből.
 * Ennek az az oka, hogy a function képét a Cloud Build építi, és ott nincs
 * GitHub Packages token. Nem is kell oda: a tarball a feltöltött forrással
 * együtt megy fel.
 *
 * A fájl NEM kerülhet a gitbe. A csomag privát, ez a repó viszont nyilvános
 * (`apps/functions/.gitignore`). Ezért futtatja ezt minden telepítés előtt a
 * CI és a `firebase.json` predeployja is, és ezért kell a fejlesztői gépen is
 * egyszer az első `npm --prefix apps/functions install` előtt.
 *
 * A verziót az `apps/functions/package.json` hivatkozása adja. Új verzió:
 * írd át ott a fájlnevet, futtasd ezt, és utána az `npm install`-t, hogy a
 * lockfile integritása is frissüljön.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGE = '@zssz-soft/zs-ai-sdk';

const root = new URL('../../', import.meta.url).pathname;
const functionsDir = join(root, 'apps/functions');
const manifest = JSON.parse(
	readFileSync(join(functionsDir, 'package.json'), 'utf8')
);
const spec = manifest.dependencies?.[PACKAGE] ?? '';
const match = /^file:(vendor\/zssz-soft-zs-ai-sdk-(\d+\.\d+\.\d+)\.tgz)$/.exec(
	spec
);

if (!match) {
	console.error(
		`[vendor-ai-sdk] Az apps/functions/package.json ${PACKAGE} hivatkozása nem file:vendor/zssz-soft-zs-ai-sdk-<verzió>.tgz alakú: "${spec}"`
	);
	process.exit(1);
}

const [, relativePath, version] = match;
const target = join(functionsDir, relativePath);

if (existsSync(target)) {
	console.log(`[vendor-ai-sdk] ${relativePath} már megvan.`);
	process.exit(0);
}

mkdirSync(join(functionsDir, 'vendor'), { recursive: true });

try {
	// A gyökérből fut, hogy a repó .npmrc-je (a @zssz-soft → GitHub Packages
	// leképezés) érvényes legyen; a tokent a ~/.npmrc vagy a CI adja.
	execFileSync(
		'npm',
		[
			'pack',
			`${PACKAGE}@${version}`,
			'--pack-destination',
			join(functionsDir, 'vendor'),
		],
		{ cwd: root, stdio: ['ignore', 'ignore', 'inherit'] }
	);
} catch {
	console.error(
		`[vendor-ai-sdk] A ${PACKAGE}@${version} nem jött le a GitHub Packagesről. Kell hozzá read:packages jogú token (~/.npmrc, a CI-ban NODE_AUTH_TOKEN).`
	);
	process.exit(1);
}

console.log(
	`[vendor-ai-sdk] ${PACKAGE}@${version} → apps/functions/${relativePath}`
);
