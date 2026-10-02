import { of } from 'rxjs';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectorsPageStore } from './collectors-page.store';
import { WALL_SORTS, WallSort } from './collectors.model';

/**
 * Everything the collectors here have finished, under the faces of whoever
 * finished it.
 *
 * Open to anybody, signed in or not: a visitor who has no shelf yet is the
 * reader this page is for. Like a collector's own page it reads published
 * documents and nothing of the catalog, so a stranger's visit is a list of
 * entries and no bundle.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectorsPageStore],
	selector: 'mc-collectors-page',
	templateUrl: './collectors-page.component.html',
	styleUrls: ['./collectors-page.component.scss'],
	imports: [...I18N_IMPORTS, NgTemplateOutlet, RouterLink],
})
export class CollectorsPageComponent {
	protected readonly store = inject(CollectorsPageStore);
	protected readonly sorts = WALL_SORTS;

	public constructor() {
		this.store.load(of(undefined));
		this.store.loadDefinitions(of(undefined));
	}

	protected onSort(value: string): void {
		this.store.setSort(value as WallSort);
	}
}
