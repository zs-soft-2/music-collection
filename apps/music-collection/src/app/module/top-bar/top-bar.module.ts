import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MenubarModule } from 'primeng/menubar';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule, NgOptimizedImage } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CoreAuthenticationViewModule } from '@music-collection/core/authentication/view';
import { UserProfileModule } from '@music-collection/domain/user';

import { TopBarComponent } from './component';

@NgModule({
	exports: [TopBarComponent],
	imports: [
		CommonModule,
		AngularSvgIconModule,
		CoreAuthenticationViewModule,
		ButtonModule,
		SelectModule,
		FormsModule,
		MenubarModule,
		NgOptimizedImage,
		ToolbarModule,
		UserProfileModule,
		TopBarComponent,
	],
})
export class TopBarModule {}
