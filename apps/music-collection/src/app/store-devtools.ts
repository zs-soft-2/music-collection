import { ModuleWithProviders, Type } from '@angular/core';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

/**
 * A Redux DevTools kapcsolat. Csak a helyben kiszolgált appban él: a
 * `production` és a `dev` build ezt a fájlt a `store-devtools.prod.ts`-re
 * cseréli (`fileReplacements`, apps/music-collection/project.json).
 *
 * Azért fájlcsere és nem `if (!environment.production)`: a feltétel az
 * `instrument()` hívását elhagyta ugyan, de a `@ngrx/store-devtools` statikus
 * importja miatt a könyvtár (~42 kB) a kitett bundle-be is belekerült.
 */
export const storeDevtools: (
	| Type<unknown>
	| ModuleWithProviders<unknown>
)[] = [StoreDevtoolsModule.instrument()];
