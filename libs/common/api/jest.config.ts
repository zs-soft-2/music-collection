// Nincs Angular a libraryben, ezért sima ts-jest fut rajta (a katalógus többi
// libje jest-preset-angularral megy) — ez is bizonyítja, hogy keretrendszer-mentes.
module.exports = {
	displayName: 'common-api',
	preset: '../../../jest.preset.js',
	testEnvironment: 'node',
	coverageDirectory: '../../../coverage/libs/common/api',
	transform: {
		'^.+\\.[tj]s$': [
			'ts-jest',
			{ tsconfig: '<rootDir>/tsconfig.spec.json' },
		],
	},
	moduleFileExtensions: ['ts', 'js'],
};
