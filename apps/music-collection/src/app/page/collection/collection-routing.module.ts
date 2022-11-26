import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CollectionPageComponent } from './component';

const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		component: CollectionPageComponent,
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class CollectionRoutingModule {}
