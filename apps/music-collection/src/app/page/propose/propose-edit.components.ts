import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS, TextService } from '@music-collection/core/i18n';
import { AlbumFormModule } from '@music-collection/domain/album';
import { ArtistFormModule } from '@music-collection/domain/artist';
import { LabelFormModule } from '@music-collection/domain/label';
import { MusicianFormModule } from '@music-collection/domain/musician';
import { ReleaseFormModule } from '@music-collection/domain/release';

import {
	provideAlbumProposal,
	provideArtistProposal,
	provideLabelProposal,
	provideMusicianProposal,
	provideReleaseProposal,
} from '../../data/proposal';
import { PageBreadcrumbComponent } from '../../shared/page-breadcrumb';

/**
 * What a collector would change about something in the catalog, in the
 * catalog's own form for it.
 *
 * One page per kind of entity, and they differ in two lines each: which form
 * they show, and which state service the proposal provider swaps out. The
 * rest — the heading, the lead, and the fact that saving writes nothing — is
 * the same question every time, so it is asked the same way.
 *
 * They share this file because they are variations of one page. Splitting
 * them into five folders would say they are five things.
 */

/** What every proposal page has in common. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-propose-page',
	imports: [...I18N_IMPORTS, PageBreadcrumbComponent],
	template: `
		<div class="page">
			<mc-page-breadcrumb [trail]="trail" />

			<p class="lead">{{ 'page.propose.lead' | transloco }}</p>

			<ng-content />
		</div>
	`,
	styles: `
		:host {
			display: block;
			color: var(--mc-text);
			font-family: var(--mc-font-body);
		}

		.page {
			max-width: var(--mc-page-max-width);
			min-height: calc(100vh - var(--mc-app-bar-height));
			margin: 0 auto;
			padding: 2rem clamp(1rem, 3vw, 2.5rem) 3rem;
		}

		.lead {
			max-width: 60ch;
			margin: 0 0 1.5rem;
			color: var(--mc-text-muted);
		}
	`,
})
export class ProposePageComponent {
	protected readonly trail = [
		{
			label: inject(TextService).translator()(
				'page.propose.suggest-a-change'
			),
		},
	];
}

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [provideArtistProposal()],
	selector: 'mc-propose-artist',
	imports: [ArtistFormModule, ProposePageComponent],
	template: `<mc-propose-page><mc-artist-form /></mc-propose-page>`,
})
export class ProposeArtistComponent {}

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [provideAlbumProposal()],
	selector: 'mc-propose-album',
	imports: [AlbumFormModule, ProposePageComponent],
	template: `<mc-propose-page><mc-album-form /></mc-propose-page>`,
})
export class ProposeAlbumComponent {}

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [provideReleaseProposal()],
	selector: 'mc-propose-release',
	imports: [ReleaseFormModule, ProposePageComponent],
	template: `<mc-propose-page><mc-release-form /></mc-propose-page>`,
})
export class ProposeReleaseComponent {}

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [provideLabelProposal()],
	selector: 'mc-propose-label',
	imports: [LabelFormModule, ProposePageComponent],
	template: `<mc-propose-page><mc-label-form /></mc-propose-page>`,
})
export class ProposeLabelComponent {}

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [provideMusicianProposal()],
	selector: 'mc-propose-musician',
	imports: [MusicianFormModule, ProposePageComponent],
	template: `<mc-propose-page><mc-musician-form /></mc-propose-page>`,
})
export class ProposeMusicianComponent {}
