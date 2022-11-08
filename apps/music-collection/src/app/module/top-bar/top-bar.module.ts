import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { MenubarModule } from 'primeng/menubar';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule, NgOptimizedImage } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CoreAuthenticationViewModule } from '@music-collection/core/authentication/view';
import { UserProfileModule } from '@music-collection/domain/user';
import { LetModule } from '@rx-angular/template';

import { TopBarComponent } from './component';

@NgModule({
	exports: [TopBarComponent],
	declarations: [TopBarComponent],
	imports: [
		CommonModule,
		AngularSvgIconModule,
		CoreAuthenticationViewModule,
		ButtonModule,
		DropdownModule,
		FormsModule,
		LetModule,
		MenubarModule,
		NgOptimizedImage,
		ToolbarModule,
		UserProfileModule,
	],
})
export class TopBarModule {}
