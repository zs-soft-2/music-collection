import { AvatarModule } from 'primeng/avatar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { UserProfileComponent } from './component/user-profile';

@NgModule({
  imports: [CommonModule, AvatarModule],
  declarations: [UserProfileComponent],
  exports: [UserProfileComponent],
})
export class UserProfileModule {}
