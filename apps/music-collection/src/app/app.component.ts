import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import {
	AuthenticationStateService,
	EntityQuantityStateService,
} from '@music-collection/api';

import { ExternalPlayerConsentService } from './data/external-player';
import { environment } from '../environments/environment';
import { CoreErrorModule } from '@music-collection/core/error';

import { TopBarModule } from './module';
import { AmbientBackdropComponent } from './shared/backdrop';
import { ConsentBarComponent } from './shared/consent';
import { PlayerStageComponent, PlayerStore } from './shared/player';
import { YoutubeDockComponent } from './shared/youtube';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	imports: [
		...I18N_IMPORTS,
		TopBarModule,
		RouterModule,
		CoreErrorModule,
		YoutubeDockComponent,
		AmbientBackdropComponent,
		PlayerStageComponent,
		ConsentBarComponent,
	],
})
export class AppComponent implements OnInit {
	private authenticationStateService = inject(AuthenticationStateService);
	private entityQuantityStateService = inject(EntityQuantityStateService);
	protected readonly player = inject(PlayerStore);
	/** Whether the outside players may be on the page at all. */
	protected readonly players = inject(ExternalPlayerConsentService);

	public title = 'music-collection';
	public version = environment.version;
	public buildTime = environment.buildTime;

	public ngOnInit(): void {
		this.entityQuantityStateService.dispatchListEntitiesAction();
	}
}
