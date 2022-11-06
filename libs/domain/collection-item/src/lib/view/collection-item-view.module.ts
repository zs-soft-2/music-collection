import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReleaseViewModule } from '@music-collection/domain/release';

import {
	CollectionItemDetailViewComponent,
	CollectionItemSimpleViewComponent,
} from './component';

@NgModule({
	declarations: [
		CollectionItemDetailViewComponent,
		CollectionItemSimpleViewComponent,
	],
	exports: [
		CollectionItemDetailViewComponent,
		CollectionItemSimpleViewComponent,
	],
	imports: [CommonModule, ReleaseViewModule],
})
export class CollectionItemViewModule {}
