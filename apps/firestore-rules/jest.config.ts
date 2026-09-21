/* eslint-disable */
module.exports = {
	displayName: 'firestore-rules',
	testEnvironment: 'node',
	moduleFileExtensions: ['ts', 'js'],
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
	},
	// The emulator is one shared database, so the suites take turns.
	maxWorkers: 1,
	coverageDirectory: '../../coverage/apps/firestore-rules',
};
