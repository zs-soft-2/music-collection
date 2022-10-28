import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { DocumentDataModule } from './data/document-data.module';
import { DocumentStoreModule } from './store/document-store.module';
import { DocumentUtilModule } from './util/document-util.module';

@NgModule({
	imports: [
		CommonModule,
		DocumentDataModule,
		DocumentStoreModule,
		DocumentUtilModule,
	],
})
export class DomainDocumentModule {}
