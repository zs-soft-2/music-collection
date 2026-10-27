/* eslint-disable */
module.exports = {
	displayName: 'music-collection',
	preset: '../../jest.preset.js',
	setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
	moduleNameMapper: {
		// The worker provider is written with `import.meta.url`, which jest's
		// CommonJS transform cannot load; tests run the layout here instead.
		'.*/network-layout\\.worker-provider$':
			'<rootDir>/src/app/page/network/network-layout.worker-provider.stub.ts',
	},
	coverageDirectory: '../../coverage/apps/music-collection',
	transform: {
		'^.+\\.(ts|mjs|js|html)$': [
			'jest-preset-angular',
			{
				tsconfig: '<rootDir>/tsconfig.spec.json',
				stringifyContentPathRegex: '\\.(html|svg)$',
			},
		],
	},
	snapshotSerializers: [
		'jest-preset-angular/build/serializers/no-ng-attributes',
		'jest-preset-angular/build/serializers/ng-snapshot',
		'jest-preset-angular/build/serializers/html-comment',
	],
};
