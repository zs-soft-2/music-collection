const { join } = require('path');
const nxPreset = require('@nx/jest/preset').default;

module.exports = {
	...nxPreset,
	// jsdom alatt a firebase böngésző-buildjét kell feloldani, különben a node-ág
	// tölt be (platform_node), ami fetch/ReadableStream globálokat vár a teszt-környezettől.
	testEnvironmentOptions: {
		...nxPreset.testEnvironmentOptions,
		customExportConditions: ['browser'],
	},
	// Csak ESM-et szállító csomagok, amiket a CommonJS-transzformnak mégis át
	// kell engednie. Egy helyen, mert a jest a projekt saját
	// `transformIgnorePatterns`-jét nem fésüli össze a presetével, hanem
	// lecseréli vele — így a következő ESM-only csomag egy sor, nem harminc.
	//   @jsverse — a transloco és a hozzá tartozó utils (index.esm.js)
	//   @angular/common/locales — a hu/de/en-GB dátum- és számadatok
	//   d3-*     — a network oldal force layoutja, amit tesztelünk is
	transformIgnorePatterns: [
		'node_modules/(?!(?:.*\\.mjs$|@jsverse|@angular/common/locales|d3-force|d3-dispatch|d3-quadtree|d3-timer))',
	],
	// A Jest 30 a CommonJS `require`-nél a fenti feltétel ellenére is a node-buildet oldja fel
	// (firebase/auth → @firebase/auth/dist/node), ezért a böngésző-CJS buildre irányítjuk.
	moduleNameMapper: {
		...nxPreset.moduleNameMapper,
		'^@firebase/auth$': join(
			__dirname,
			'node_modules/@firebase/auth/dist/browser-cjs/index.js'
		),
	},
};
