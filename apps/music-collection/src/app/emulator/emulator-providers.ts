import type { EnvironmentProviders, Provider } from '@angular/core';

/**
 * What the end-to-end build puts in place of the real thing. Nothing here:
 * the `emulator` build configuration swaps this file for
 * `emulator-providers.emulator.ts`, so the dev and the prod bundle carry none
 * of it.
 */
export const emulatorProviders: (Provider | EnvironmentProviders)[] = [];
