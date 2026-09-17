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
