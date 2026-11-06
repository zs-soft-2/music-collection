import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

/**
 * A szerkesztő négy lapja, sorrendben, mindegyik a maga színével.
 *
 * Egy űrlapban álltak eddig, egymás alatt: a szabály aljáig görgetni kellett
 * ahhoz, hogy valaki a jelvényhez érjen, és a borító mezőjébe ágyazott
 * rajzolópad végképp nem látszott annak, ami. A lapok nem rejtik el a
 * munkát, csak egyszerre egy döntést tesznek ki — a találatok oldalsávja
 * mind a négy mellett ott marad, mert az minden döntésre válaszol.
 *
 * A szín nem dísz: ugyanaz a `--tint` fut végig a lap szakaszain, a
 * mezői fókuszgyűrűjén és az oldalsávon, így a nyitott lap a lap aljáról is
 * felismerhető.
 */
export const EDIT_TABS = [
	{
		id: 'basics',
		labelKey: 'ui.musicCollectionEdit.basics',
		icon: 'pi pi-id-card',
		tint: 'var(--mc-series-2)',
	},
	{
		id: 'rule',
		labelKey: 'ui.musicCollectionEdit.rule',
		icon: 'pi pi-filter',
		tint: 'var(--mc-series-4)',
	},
	{
		id: 'looks',
		labelKey: 'ui.musicCollectionEdit.looks',
		icon: 'pi pi-image',
		tint: 'var(--mc-series-5)',
	},
	{
		id: 'badge',
		labelKey: 'ui.musicCollectionEdit.badge',
		icon: 'pi pi-star',
		tint: 'var(--mc-series-6)',
	},
] as const;

export type EditTabId = (typeof EDIT_TABS)[number]['id'];

/**
 * The editor's tab strip. Which tab is open is the page's state: the strip
 * shows it and says which one was asked for. The panels stay with the page,
 * which hides rather than removes them.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-edit-tabs',
	imports: [...I18N_IMPORTS],
	templateUrl: './collection-edit-tabs.component.html',
	styleUrl: './collection-edit-tabs.component.scss',
})
export class CollectionEditTabsComponent {
	public readonly active = input.required<EditTabId>();
	/** Hány szűrőt visel a szabály — ennyi áll a lap fülén. */
	public readonly criteriaCount = input(0);
	/** Van-e már borító, illetve jelvény: egy pötty jelzi a fülön. */
	public readonly hasCover = input(false);
	public readonly hasBadge = input(false);

	public readonly activeChange = output<EditTabId>();

	protected readonly tabs = EDIT_TABS;

	/**
	 * Nyilakkal is lehet lapozni, ahogy egy `tablist`-től elvárható: a
	 * fókusz a lappal megy, különben a következő nyíl a régi gombról
	 * indulna.
	 */
	protected onTabKey(event: KeyboardEvent): void {
		const step =
			event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;

		if (!step) {
			return;
		}

		event.preventDefault();

		const index = EDIT_TABS.findIndex((one) => one.id === this.active());
		const next =
			EDIT_TABS[(index + step + EDIT_TABS.length) % EDIT_TABS.length];

		this.activeChange.emit(next.id);
		(event.currentTarget as HTMLElement).parentElement
			?.querySelector<HTMLElement>(`#tab-${next.id}`)
			?.focus();
	}
}
