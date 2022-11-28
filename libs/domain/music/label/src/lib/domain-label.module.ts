import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { LabelDataModule } from './data/label-data.module';
import { LabelStoreModule } from './store/label-store.module';
import { LabelUtilModule } from './util/label-util.module';

@NgModule({
	imports: [CommonModule, LabelDataModule, LabelUtilModule, LabelStoreModule],
})
export class DomainLabelModule {}
