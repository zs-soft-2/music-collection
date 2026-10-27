import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { MembershipEffect } from '../../data/membership.effect';
import { MusicianBandsStore } from '../../store/musician-bands.store';

/**
 * Admin: the bands a musician played in, from the same `membership`
 * documents the artist's line-up is edited in. Read only, with a link to
 * the band whose line-up carries the row.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [MembershipEffect, MusicianBandsStore],
	selector: 'mc-musician-bands',
	templateUrl: './musician-bands.component.html',
	styleUrls: ['./musician-bands.component.scss'],
	imports: [...I18N_IMPORTS, RouterLink],
})
export class MusicianBandsComponent implements OnInit {
	public readonly store = inject(MusicianBandsStore);

	public readonly musicianId = input.required<string>();

	public ngOnInit(): void {
		this.store.load(this.musicianId());
	}
}
