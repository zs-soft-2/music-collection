import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { DocumentDataService } from '@music-collection/api';

import { DocumentDataServiceImpl } from './service';

@NgModule({
	imports: [CommonModule, provideStorage(() => getStorage())],
	providers: [
		{
			provide: DocumentDataService,
			useClass: DocumentDataServiceImpl,
		},
	],
})
export class DocumentDataModule {}
