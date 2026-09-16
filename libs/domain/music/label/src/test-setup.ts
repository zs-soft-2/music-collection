import 'jest-preset-angular/setup-jest';
import { TextDecoder, TextEncoder } from 'util';

// A jsdom nem adja meg a TextDecoder/TextEncoder globálokat, a firebase/auth -> undici lánc viszont igényli.
Object.assign(globalThis, { TextDecoder, TextEncoder });
