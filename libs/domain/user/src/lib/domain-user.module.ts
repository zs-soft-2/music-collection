import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { UserDataModule } from './data';
import { UserStoreModule } from './store';

@NgModule({
	imports: [CommonModule, UserDataModule, UserStoreModule],
})
export class DomainUserModule {}
