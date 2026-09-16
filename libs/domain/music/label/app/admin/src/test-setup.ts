// @ts-expect-error https://thymikee.github.io/jest-preset-angular/docs/getting-started/test-environment
globalThis.ngJest = {
	testEnvironmentOptions: {
		errorOnUnknownElements: true,
		errorOnUnknownProperties: true,
	},
};
import 'jest-preset-angular/setup-jest';
import { TextDecoder, TextEncoder } from 'util';

// A jsdom nem adja meg a TextDecoder/TextEncoder globálokat, a firebase/auth -> undici lánc viszont igényli.
Object.assign(globalThis, { TextDecoder, TextEncoder });
