/* eslint-disable */
module.exports = {
	displayName: 'functions',
	testEnvironment: 'node',
	moduleFileExtensions: ['ts', 'js'],
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
		// A @zssz-soft/zs-ai-sdk csak ESM-et szállít. A futó function a Node
		// `require(esm)`-jével tölti be, a jest saját CommonJS-futtatója viszont
		// nem — neki CommonJS-re fordítjuk, csak ezt az egy csomagot.
		'^.+\\.js$': [
			'ts-jest',
			{
				tsconfig: {
					allowJs: true,
					module: 'commonjs',
					moduleResolution: 'bundler',
				},
				diagnostics: false,
			},
		],
	},
	transformIgnorePatterns: ['/node_modules/(?!@zssz-soft/zs-ai-sdk/)'],
	coverageDirectory: '../../coverage/apps/functions',
};
