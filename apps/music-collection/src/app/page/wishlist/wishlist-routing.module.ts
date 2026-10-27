import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { WishlistPageComponent } from './component';

const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		component: WishlistPageComponent,
	},
	{
		// One wish of one collector: which record is wanted, in what shape,
		// and which pressings of it the catalog knows.
		path: ':itemId',
		loadComponent: () =>
			import('../wishlist-item/wishlist-item-page.component').then(
				(module) => module.WishlistItemPageComponent
			),
		data: {
			breadcrumb: 'wish',
		},
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class WishlistRoutingModule {}
