import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ArtistCollectionModule } from '@music-collection/domain/artist';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';

@NgModule({
	declarations: [HomeComponent],
	imports: [CommonModule, HomeRoutingModule, ArtistCollectionModule],
})
export class HomeModule {}
