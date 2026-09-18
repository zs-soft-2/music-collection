import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { MusicianDataModule } from './data/musician-data.module';
import { MusicianStoreModule } from './store/musician-store.module';
import { MusicianUtilModule } from './util/musician-util.module';

@NgModule({
	imports: [
		CommonModule,
		MusicianDataModule,
		MusicianUtilModule,
		MusicianStoreModule,
	],
})
export class DomainMusicianModule {}
