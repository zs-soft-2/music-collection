import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { WishlistPageComponent } from './component';

const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		component: WishlistPageComponent,
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class WishlistRoutingModule {}
