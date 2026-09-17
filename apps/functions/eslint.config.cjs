const baseConfig = require('../../eslint.config.cjs');

module.exports = [
	...baseConfig,
	{
		// A Cloud Functions futtatókörnyezete Node — a functions saját
		// package.json-jából telepített függőségekkel dolgozik, ezért a
		// workspace-en kívüli importokat nem korlátozzuk.
		files: ['**/*.ts'],
		rules: {},
	},
	{
		ignores: ['lib/**'],
	},
];
