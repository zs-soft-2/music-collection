import { NgModule } from '@angular/core';

import { WishlistPageComponent } from './component';
import { WishlistRoutingModule } from './wishlist-routing.module';

@NgModule({
	imports: [WishlistRoutingModule, WishlistPageComponent],
})
export class WishlistModule {}
