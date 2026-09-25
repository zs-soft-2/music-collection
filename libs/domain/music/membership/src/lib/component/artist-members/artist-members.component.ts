import { I18N_IMPORTS, TextService } from '@music-collection/core/i18n';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	computed,
	inject,
	input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
	MembershipEntity,
	MembershipPermissionsService,
	MusicianEntity,
	RoleNames,
} from '@music-collection/api';
import {
	ArtistCandidatePickerComponent,
	toCandidateRow,
} from '@music-collection/domain/artist';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AutoComplete } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';

import { MembershipEffect } from '../../data/membership.effect';
import { INSTRUMENT_GROUPS, unlistedInstruments } from '../../data/instruments';
import { ArtistMembersStore } from '../../store/artist-members.store';

/** The year a band can first have played in, to catch a mistyped year. */
const EARLIEST_YEAR = 1900;

/**
 * Admin: the band's line-up. Members and guests with their instruments and
 * years, as the artist page shows them — and as the musician's own page
 * shows the other way round, since both read the same documents.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [MembershipEffect, ArtistMembersStore],
	selector: 'mc-artist-members',
	templateUrl: './artist-members.component.html',
	styleUrls: ['./artist-members.component.scss'],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		NgxPermissionsModule,
		ArtistCandidatePickerComponent,
		AutoComplete,
		Button,
		Checkbox,
		Dialog,
		InputNumber,
		InputText,
		MultiSelect,
		Select,
	],
})
export class ArtistMembersComponent implements OnInit {
	private readonly text = inject(TextService);

	public readonly store = inject(ArtistMembersStore);

	public readonly artistId = input.required<string>();

	/** Who may change a line-up; the rules ask for the same permissions. */
	public readonly writePermissions = [
		RoleNames.ADMIN,
		MembershipPermissionsService.createMembershipEntity,
		MembershipPermissionsService.updateMembershipEntity,
	];

	public readonly earliestYear = EARLIEST_YEAR;
	public readonly latestYear = new Date().getFullYear();

	/** Member or guest, for the kind field of the open row. */
	public readonly kinds = computed(() => {
		const translate = this.text.translator();

		return [
			{
				value: 'member',
				label: translate('ui.artistMembers.kind-member'),
			},
			{ value: 'guest', label: translate('ui.artistMembers.kind-guest') },
		];
	});

	/**
	 * The instruments the field offers, grouped, each in the language on
	 * screen — so that a Hungarian admin picks "Dob" and the row still holds
	 * `Drums`.
	 *
	 * Whatever the open row holds that the list does not offer is added as a
	 * group of its own. It is there to be kept or taken off, not to be picked
	 * again: an import from before the list, or a Discogs credit calling
	 * something an instrument, would otherwise vanish on the next save.
	 */
	public readonly instrumentGroups = computed(() => {
		const translate = this.text.translator();
		const label = this.text.catalog();
		const groups = INSTRUMENT_GROUPS.map((group) => ({
			label: translate(`ui.artistMembers.instrument-group.${group.key}`),
			items: group.instruments.map((instrument) => ({
				label: label('instrument', instrument),
				value: instrument,
			})),
		}));
		const unlisted = unlistedInstruments(
			this.store.draft()?.instruments ?? []
		);

		return unlisted.length
			? [
					...groups,
					{
						label: translate(
							'ui.artistMembers.instrument-group.unlisted'
						),
						items: unlisted.map((instrument) => ({
							label: instrument,
							value: instrument,
						})),
					},
				]
			: groups;
	});

	/** A name typed but not picked can be created as a musician. */
	public readonly creatable = computed(() => {
		const draft = this.store.draft();
		const name = draft?.musicianName?.trim() ?? '';

		return !draft?.musicianUid && name.length > 1 ? name : null;
	});

	/** The namesakes as the picker lists them. */
	public readonly namesakeRows = computed(
		() => this.store.namesakes()?.map(toCandidateRow) ?? null
	);

	public ngOnInit(): void {
		this.store.load(this.artistId());
		this.store.loadAlbums(this.artistId());
	}

	/** The picker hands back a row; the store works from the candidate. */
	public chooseNamesake(row: { musicBrainzId: string }): void {
		const candidate = this.store
			.namesakes()
			?.find((hit) => hit.musicBrainzId === row.musicBrainzId);

		if (candidate) {
			this.store.chooseNamesake(candidate);
		}
	}

	public edit(row: MembershipEntity): void {
		this.store.startEdit(row);
	}

	/** A name typed by hand names nobody until it is picked from the list. */
	public typeMusician(value: string | MusicianEntity): void {
		if (typeof value === 'string') {
			this.store.patchDraft({ musicianName: value, musicianUid: '' });
		}
	}

	public pickMusician(musician: MusicianEntity): void {
		this.store.patchDraft({
			musicianUid: musician.uid,
			musicianName: musician.name,
		});
	}

	public setInstruments(instruments: string[]): void {
		this.store.patchDraft({ instruments });
	}

	public setKind(kind: 'member' | 'guest'): void {
		this.store.patchDraft({
			kind,
			active: kind === 'member' && this.store.draft()?.active !== false,
		});
	}

	/** A current member has no end year; the field is cleared with the tick. */
	public setActive(active: boolean): void {
		this.store.patchDraft({
			active,
			to: active ? null : (this.store.draft()?.to ?? null),
		});
	}

	public setFrom(from: number | null): void {
		this.store.patchDraft({ from });
	}

	public setTo(to: number | null): void {
		this.store.patchDraft({ to });
	}
}
