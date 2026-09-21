import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { ArtistExternalCandidateRow } from '../artist-external-candidate';

/**
 * Asks which of the artists sharing a name the catalog's one is. It is
 * asked wherever the load would otherwise guess, so the answer is the
 * admin's and not a ranking's.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-candidate-picker',
	templateUrl: './artist-candidate-picker.component.html',
	styleUrls: ['./artist-candidate-picker.component.scss'],
	imports: [Button, Dialog],
})
export class ArtistCandidatePickerComponent {
	/** The namesakes to choose between; null while there is nothing to ask. */
	public readonly candidates = input<ArtistExternalCandidateRow[] | null>(
		null
	);
	/** What the pick is for, under the question. */
	public readonly hint = input('');

	public readonly closed = output<void>();
	public readonly picked = output<ArtistExternalCandidateRow>();
}
