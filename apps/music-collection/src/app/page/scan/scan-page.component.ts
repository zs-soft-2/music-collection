import {
	ChangeDetectionStrategy,
	Component,
	inject,
	viewChild,
	ElementRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ScanPageStore } from './scan-page.store';
import { ScanCandidateView, MATCH_LABELS, STATE_LABELS } from './scan.mapper';

/**
 * Scan page: photograph a record, and the app says which pressing it is and
 * where it stands in the catalog. Every result needs one confirmation — the
 * scan never adds anything on its own.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ScanPageStore],
	selector: 'mc-scan-page',
	templateUrl: './scan-page.component.html',
	styleUrls: ['./scan-page.component.scss'],
	imports: [...I18N_IMPORTS, RouterLink],
})
export class ScanPageComponent {
	protected readonly store = inject(ScanPageStore);
	protected readonly matchLabels = MATCH_LABELS;
	protected readonly stateLabels = STATE_LABELS;

	private readonly fileInput =
		viewChild.required<ElementRef<HTMLInputElement>>('file');

	protected pick(): void {
		this.fileInput().nativeElement.click();
	}

	protected onFile(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			this.store.scan(file);
		}
		// The same record photographed twice must fire the change event again.
		input.value = '';
	}

	/** Where a candidate leads: the album page, with the picker preselected. */
	protected albumLink(candidate: ScanCandidateView): unknown[] {
		return ['/album', candidate.albumUid ?? ''];
	}

	protected albumQuery(candidate: ScanCandidateView): Record<string, string> {
		if (candidate.releaseUid) {
			return { pick: `release:${candidate.releaseUid}` };
		}
		if (candidate.discogsReleaseId) {
			return { pick: `discogs:${candidate.discogsReleaseId}` };
		}

		return { pick: 'open' };
	}

	protected request(candidate: ScanCandidateView): void {
		const match = this.store
			.candidates()
			.find(
				(item) =>
					item.discogsReleaseId === candidate.discogsReleaseId &&
					item.discogsMasterId === candidate.discogsMasterId
			);

		if (match) {
			this.store.request({ view: candidate, candidate: match });
		}
	}

	protected requested(candidate: ScanCandidateView): boolean {
		return this.store.requestedKeys().includes(candidate.key);
	}

	protected rescan(): void {
		this.store.reset();
		this.pick();
	}
}
