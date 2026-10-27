import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
	NavigationCancel,
	NavigationEnd,
	NavigationError,
	Router,
	RouterModule,
} from '@angular/router';
import { filter, map, take } from 'rxjs';
import {
	AuthenticationStateService,
	EntityQuantityStateService,
} from '@music-collection/api';

import { DemoTourService } from './data/demo-tour';
import { ExternalPlayerConsentService } from './data/external-player';
import { environment } from '../environments/environment';
import { CoreErrorModule } from '@music-collection/core/error';

import { SideRailComponent, TabBarComponent, TopBarModule } from './module';
// A @defer mögötti komponensek a fájljukból jönnek, nem a barrelből: a
// barrel a main chunkba húzná őket, és a @defer semmit nem választana le.
import { AmbientBackdropComponent } from './shared/backdrop/ambient-backdrop.component';
import { SceneBackdropComponent } from './shared/backdrop/scene-backdrop.component';
import { ConsentBarComponent } from './shared/consent';
import { DemoTourComponent } from './shared/demo-tour/demo-tour.component';
import { DailyQuestionBannerComponent } from './shared/daily-question';
import { PlayerStageComponent } from './shared/player/stage/player-stage.component';
import { PlayerStore } from './shared/player/player.store';
import { VerdictPromptComponent } from './shared/verdict-prompt';
import { YoutubeDockComponent } from './shared/youtube/youtube-dock.component';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	imports: [
		...I18N_IMPORTS,
		TopBarModule,
		SideRailComponent,
		TabBarComponent,
		RouterModule,
		CoreErrorModule,
		YoutubeDockComponent,
		AmbientBackdropComponent,
		SceneBackdropComponent,
		PlayerStageComponent,
		ConsentBarComponent,
		DailyQuestionBannerComponent,
		DemoTourComponent,
		VerdictPromptComponent,
	],
})
export class AppComponent implements OnInit {
	private authenticationStateService = inject(AuthenticationStateService);
	private entityQuantityStateService = inject(EntityQuantityStateService);
	private readonly router = inject(Router);
	protected readonly player = inject(PlayerStore);
	/** Whether the outside players may be on the page at all. */
	protected readonly players = inject(ExternalPlayerConsentService);
	/** Whether this collector asked to be shown around. */
	protected readonly tour = inject(DemoTourService);

	/**
	 * The first page has not arrived: the route's chunk is on its way, or an
	 * initializer is still waiting. The outlet is empty until then, and an
	 * empty outlet is a black screen, so something says the app is coming.
	 */
	protected readonly booting = toSignal(
		this.router.events.pipe(
			filter(
				(event) =>
					event instanceof NavigationEnd ||
					event instanceof NavigationCancel ||
					event instanceof NavigationError
			),
			take(1),
			map(() => false)
		),
		{ initialValue: true }
	);

	public title = 'music-collection';
	public version = environment.version;
	public buildTime = environment.buildTime;

	/**
	 * The per-type counters are read by the catalog's write effects alone, and
	 * a guest writes nothing — so they are fetched once someone signs in, not
	 * on every visitor's first page.
	 */
	public ngOnInit(): void {
		this.authenticationStateService
			.selectIsAuthenticated$()
			.pipe(filter(Boolean), take(1))
			.subscribe(() =>
				this.entityQuantityStateService.dispatchListEntitiesAction()
			);
	}
}
