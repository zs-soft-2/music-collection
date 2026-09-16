const nxPreset = require('@nx/jest/preset').default;

module.exports = {
	...nxPreset,
	// jsdom alatt a firebase böngésző-buildjét kell feloldani, különben a node-ág
	// tölt be (platform_node), ami fetch/ReadableStream globálokat vár a teszt-környezettől.
	testEnvironmentOptions: {
		...nxPreset.testEnvironmentOptions,
		customExportConditions: ['browser'],
	},
};
