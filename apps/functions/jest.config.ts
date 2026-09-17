/* eslint-disable */
module.exports = {
	displayName: 'functions',
	testEnvironment: 'node',
	moduleFileExtensions: ['ts', 'js'],
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{ tsconfig: '<rootDir>/tsconfig.spec.json' },
		],
	},
	coverageDirectory: '../../coverage/apps/functions',
};
