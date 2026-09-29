import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();
import { TextDecoder, TextEncoder } from 'util';

// A jsdom nem adja meg a TextDecoder/TextEncoder globálokat, a firebase/auth -> undici lánc viszont igényli.
Object.assign(globalThis, { TextDecoder, TextEncoder });
