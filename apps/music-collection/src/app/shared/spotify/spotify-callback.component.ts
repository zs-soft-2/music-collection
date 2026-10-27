import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
	signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { SpotifyIconComponent } from './spotify-icon.component';
import { SpotifyPlaybackStore } from './spotify-playback.store';

/** Return address of the Spotify sign-in (`/spotify/callback`). */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-spotify-callback',
	imports: [...I18N_IMPORTS, RouterLink, SpotifyIconComponent],
	template: `
		<div class="callback">
			@if (error(); as error) {
				<h1>
					{{
						'ui.spotifyCallback.spotify-sign-in-failed' | transloco
					}}
				</h1>
				<p role="alert">{{ error }}</p>
				<a routerLink="/home">{{
					'ui.spotifyCallback.back-to-home' | transloco
				}}</a>
			} @else {
				<p class="connecting" role="status">
					<mc-spotify-icon />
					{{ 'ui.spotifyCallback.connecting-to-spotify' | transloco }}
				</p>
			}
		</div>
	`,
	styles: `
		.callback {
			max-width: 36rem;
			margin: 4rem auto;
			padding: 0 1rem;
			text-align: center;
		}

		.connecting {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
		}

		a {
			color: var(--mc-primary);
		}
	`,
})
export class SpotifyCallbackComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly spotify = inject(SpotifyPlaybackStore);

	protected readonly error = signal<string | null>(null);

	public async ngOnInit(): Promise<void> {
		const params = this.route.snapshot.queryParamMap;
		const code = params.get('code');
		const state = params.get('state');

		if (params.get('error') || !code || !state) {
			this.error.set(
				params.get('error') === 'access_denied'
					? 'Access to Spotify was not allowed.'
					: 'Spotify did not complete the sign-in.'
			);
			return;
		}
		try {
			const returnUrl = await this.spotify.completeLogin(code, state);
			await this.router.navigateByUrl(returnUrl || '/home', {
				replaceUrl: true,
			});
		} catch (error) {
			this.error.set(
				error instanceof Error ? error.message : String(error)
			);
		}
	}
}
