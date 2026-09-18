import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
	AuthenticationStateService,
	EntityQuantityStateService,
} from '@music-collection/api';

import { environment } from '../environments/environment';
import { CoreErrorModule } from '@music-collection/core/error';

import { TopBarModule } from './module';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	imports: [TopBarModule, RouterModule, CoreErrorModule],
})
export class AppComponent implements OnInit {
	private authenticationStateService = inject(AuthenticationStateService);
	private entityQuantityStateService = inject(EntityQuantityStateService);

	public title = 'music-collection';
	public version = environment.version;
	public buildTime = environment.buildTime;

	public ngOnInit(): void {
		this.entityQuantityStateService.dispatchListEntitiesAction();
	}
}
