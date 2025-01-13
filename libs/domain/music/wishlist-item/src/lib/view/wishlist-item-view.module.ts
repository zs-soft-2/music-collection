import { ChipModule } from 'primeng/chip';
import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from 'ng-flex-layout';

import { WishlistItemSimpleViewComponent } from './component';

@NgModule({
	declarations: [WishlistItemSimpleViewComponent],
	exports: [WishlistItemSimpleViewComponent],
	imports: [CommonModule, ChipModule, FlexLayoutModule, ImageModule],
})
export class WishlistItemViewModule {}
