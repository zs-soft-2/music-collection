import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	inject,
	viewChild,
} from '@angular/core';
import { PhotoMedia, SpineField } from '@music-collection/api';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ShelfScanPageStore } from './shelf-scan-page.store';
import { ShelfRow, STATE_LABELS } from './shelf-scan.mapper';

/**
 * Shelf scan page: photograph a compartment, and the app reads every spine
 * in it. What comes back is a table, not a result — the collector corrects
 * it and decides what goes in. Nothing is written before they submit.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ShelfScanPageStore],
	selector: 'mc-shelf-scan-page',
	templateUrl: './shelf-scan-page.component.html',
	styleUrls: ['./shelf-scan-page.component.scss'],
	imports: [...I18N_IMPORTS],
})
export class ShelfScanPageComponent {
	protected readonly store = inject(ShelfScanPageStore);
	protected readonly stateLabels = STATE_LABELS;
	protected readonly mediaOptions: PhotoMedia[] = [
		'vinyl',
		'cd',
		'cassette',
		'dvd',
	];

	private readonly fileInput =
		viewChild.required<ElementRef<HTMLInputElement>>('file');

	protected pick(): void {
		this.fileInput().nativeElement.click();
	}

	protected onFile(event: Event): void {
		const input = event.target as HTMLInputElement;

		for (const file of Array.from(input.files ?? [])) {
			this.store.addPhoto(file);
		}
		// The same compartment photographed twice must fire the event again.
		input.value = '';
	}

	protected onMedia(event: Event): void {
		const value = (event.target as HTMLSelectElement).value;

		this.store.setMedia((value || null) as PhotoMedia | null);
	}

	protected onEdit(row: ShelfRow, field: SpineField, event: Event): void {
		this.store.edit(
			row.position,
			field,
			(event.target as HTMLInputElement).value
		);
	}

	/** The other photo's reading, as text for the "take it" button. */
	protected alternative(row: ShelfRow, field: SpineField): string {
		return String(row.alternatives[field] ?? '');
	}

	protected submit(): void {
		this.store.submit(this.store.submittable());
	}

	protected trackRow = (_: number, row: ShelfRow) => row.position;
}
