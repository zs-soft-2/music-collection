import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { MenubarModule } from 'primeng/menubar';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TopBarComponent } from './component';
import { UserProfileModule } from '@music-collection/domain/user';
import { CoreAuthenticationViewModule } from '@music-collection/core/authentication/view';

@NgModule({
  exports: [TopBarComponent],
  declarations: [TopBarComponent],
  imports: [
    CommonModule,
    CoreAuthenticationViewModule,
    ButtonModule,
    DropdownModule,
    FormsModule,
    MenubarModule,
    ToolbarModule,
    UserProfileModule,
  ],
})
export class TopBarModule {}
