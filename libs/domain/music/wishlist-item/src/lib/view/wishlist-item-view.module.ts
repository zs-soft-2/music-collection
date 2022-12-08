import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ImageModule } from 'primeng/image';

import { FlexLayoutModule } from '@angular/flex-layout';

import { WishlistItemSimpleViewComponent } from './component';

@NgModule({
	declarations: [WishlistItemSimpleViewComponent],
	exports: [WishlistItemSimpleViewComponent],
	imports: [CommonModule, FlexLayoutModule, ImageModule],
})
export class WishlistItemViewModule {}
