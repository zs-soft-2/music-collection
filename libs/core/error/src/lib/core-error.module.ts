import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { CoreErrorStoreModule } from './store/core-error-store.module';
import { CoreErrorViewModule } from './view/core-error-view.module';

@NgModule({
	exports: [CoreErrorStoreModule, CoreErrorViewModule],
	imports: [CommonModule, CoreErrorStoreModule, CoreErrorViewModule],
})
export class CoreErrorModule {}
