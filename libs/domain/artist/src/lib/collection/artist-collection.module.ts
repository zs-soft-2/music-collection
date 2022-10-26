import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ArtistListComponent, ArtistTableComponent } from './component';

@NgModule({
	declarations: [ArtistListComponent, ArtistTableComponent],
	exports: [ArtistListComponent, ArtistTableComponent],
	imports: [CommonModule, ButtonModule, ChipModule, TableModule],
})
export class ArtistCollectionModule {}
