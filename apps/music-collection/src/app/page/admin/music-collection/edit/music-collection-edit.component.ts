import { map } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionBadgePanelComponent } from './component/collection-badge-panel/collection-badge-panel.component';
import { CollectionBasicsPanelComponent } from './component/collection-basics-panel/collection-basics-panel.component';
import { CollectionEditHeroComponent } from './component/collection-edit-hero/collection-edit-hero.component';
import { CollectionEditPreviewComponent } from './component/collection-edit-preview/collection-edit-preview.component';
import {
	CollectionEditTabsComponent,
	EDIT_TABS,
	type EditTabId,
} from './component/collection-edit-tabs/collection-edit-tabs.component';
import { CollectionLooksPanelComponent } from './component/collection-looks-panel/collection-looks-panel.component';
import { CollectionRulePanelComponent } from './component/collection-rule-panel/collection-rule-panel.component';
import { MusicCollectionEditStore } from './music-collection-edit.store';

/**
 * Admin: writing one collection's rule. The preview resolves the criteria
 * against the catalog as they are typed — the definition is the source of
 * truth, and this is the first place anyone sees its shadow.
 *
 * The page holds the frame — which tab is open, the tab panels, the save
 * row — and provides the store; the head, each tab's fields and the preview
 * are components of their own under `component/`, and the tabs reach the
 * store through this page's injector.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-music-collection-edit',
	providers: [MusicCollectionEditStore],
	imports: [
		...I18N_IMPORTS,
		RouterLink,
		CollectionBadgePanelComponent,
		CollectionBasicsPanelComponent,
		CollectionEditHeroComponent,
		CollectionEditPreviewComponent,
		CollectionEditTabsComponent,
		CollectionLooksPanelComponent,
		CollectionRulePanelComponent,
	],
	templateUrl: './music-collection-edit.component.html',
	styleUrl: './music-collection-edit.component.scss',
})
export class MusicCollectionEditComponent {
	protected readonly store = inject(MusicCollectionEditStore);

	/**
	 * Melyik lap van felül. Nézeti állapot, ezért marad a komponensben: a
	 * store a definíciót írja, és abban ennek nyoma sincs.
	 */
	protected readonly tab = signal<EditTabId>('basics');

	/** A nyitott lap színe, amit az egész elrendezés átvesz. */
	protected readonly tint = computed(
		() => EDIT_TABS.find((one) => one.id === this.tab())?.tint ?? ''
	);

	/**
	 * Hány szűrőt visel a szabály — ennyi áll a lap fülén. A feloldott
	 * alakból számol, nem az űrlapéból: egy üresen hagyott operátor vagy egy
	 * érték nélküli lista nem szűrő, és a fül sem mondhatja annak.
	 */
	protected readonly criteriaCount = computed(
		() => Object.keys(this.store.criteria()).length
	);

	public constructor() {
		this.store.load(
			inject(ActivatedRoute).paramMap.pipe(
				map((params) => params.get('uid') ?? '0')
			)
		);
	}
}
