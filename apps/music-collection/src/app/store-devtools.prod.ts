import { ModuleWithProviders, Type } from '@angular/core';

/** A kitett buildek párja: a DevTools nem kerül a bundle-be. */
export const storeDevtools: (
	| Type<unknown>
	| ModuleWithProviders<unknown>
)[] = [];
