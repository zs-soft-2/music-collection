import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
	CollectionItemDetailViewComponent,
	CollectionItemSimpleViewComponent,
} from './component';

@NgModule({
	declarations: [
		CollectionItemDetailViewComponent,
		CollectionItemSimpleViewComponent,
	],
	imports: [CommonModule],
})
export class CollectionItemViewModule {}
