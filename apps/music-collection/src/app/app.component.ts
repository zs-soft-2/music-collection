import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
	AuthenticationStateService,
	EntityQuantityStateService,
} from '@music-collection/api';
import { environment } from '../environments/environment';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
	public title = 'music-collection';
	public version = environment.version;

	public constructor(
		private authenticationStateService: AuthenticationStateService,
		private entityQuantityStateService: EntityQuantityStateService
	) {}

	public ngOnInit(): void {
		this.entityQuantityStateService.dispatchListEntitiesAction();
	}
}
