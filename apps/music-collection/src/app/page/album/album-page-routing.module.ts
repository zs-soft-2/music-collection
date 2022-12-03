import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AlbumPageComponent } from './album-page.component';

const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		component: AlbumPageComponent,
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class AlbumPageRoutingModule {}
