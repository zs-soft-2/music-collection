import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ArtistPageComponent } from './artist-page.component';

const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		component: ArtistPageComponent,
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class ArtistPageRoutingModule {}
