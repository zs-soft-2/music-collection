import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';
import {
	ACT_SEARCH_LENGTH,
	ConcertArtistMatch,
	ConcertDraft,
	ConcertEventType,
	ConcertSuggestionEntity,
	VenueEntity,
} from '@music-collection/api';
import { normalizeCatalogName } from '@music-collection/common/engine';
import { VENUE_IN_USE } from '@music-collection/domain/concert';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { AutoComplete } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { ConcertAdminStore, ConcertAdminTab } from './concert-admin.store';

/** The kinds a night can be filed as, in the order the select offers them. */
const EVENT_TYPES: ConcertEventType[] = ['concert', 'festival', 'other'];

/**
 * Admin: the concerts of the catalog's bands, and the three loads that fill
 * them.
 *
 * The buttons are deliberately separate, because they do not cost the same
 * thing. The venue load is a few hundred MusicBrainz requests under a
 * one-per-second limit — slow, free, and rarely needed. The concert load is a
 * handful of requests and writes straight to the public page: every night it
 * files is anchored on an mbid. The AI run is paid per artist and writes
 * nothing public at all; what it proposes waits on the first tab until someone
 * opens the cited source.
 *
 * That last step is the one worth explaining to whoever maintains this: there
 * is no free API for future concerts. MusicBrainz holds two Hungarian events in
 * total. A model with search grounding finds what a person searching would
 * find, and is wrong in the same ways — so a person reads it first.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-concert-admin',
	providers: [ConcertAdminStore],
	templateUrl: './concert-admin.component.html',
	styleUrls: ['./concert-admin.component.scss'],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		AutoComplete,
		Button,
		Checkbox,
		InputText,
		Select,
	],
})
export class ConcertAdminComponent {
	protected readonly store = inject(ConcertAdminStore);

	protected readonly inUse = VENUE_IN_USE;

	/** From how many characters an act row asks the catalog. */
	protected readonly actSearchLength = ACT_SEARCH_LENGTH;

	private readonly transloco = inject(TranslocoService);

	protected readonly tabs: { key: ConcertAdminTab; labelKey: string }[] = [
		{ key: 'suggestions', labelKey: 'admin.concert.tab.suggestions' },
		{ key: 'concerts', labelKey: 'admin.concert.tab.concerts' },
		{ key: 'venues', labelKey: 'admin.concert.tab.venues' },
	];

	/**
	 * The kinds, as the select wants them: labels already in words. A select
	 * prints `optionLabel` as it is given — a key handed to it stays a key on
	 * screen, which is what this list used to show.
	 */
	protected eventTypes(): { label: string; value: ConcertEventType }[] {
		return EVENT_TYPES.map((value) => ({
			label: this.transloco.translate(`admin.concert.type.${value}`),
			value,
		}));
	}

	/**
	 * The night's own name, when it says something the credited artist does
	 * not. A concert filed under Suffocation can be called "Hatebreed | Life of
	 * Agony | … | Suffocation", and the heading that names only the band is
	 * then the one thing on the form that does not say what is being edited.
	 */
	protected eventName(draft: ConcertDraft): string | null {
		const title = draft.title.trim();

		return title &&
			normalizeCatalogName(title) !==
				normalizeCatalogName(draft.artistName)
			? title
			: null;
	}

	/**
	 * What the catalog offered for an act row — for that row alone.
	 *
	 * Only one row can be typed into, so the store keeps one answer; handing
	 * it to every row would drop another row's list under the one being
	 * edited the moment an answer arrives.
	 */
	protected matchesFor(index: number): ConcertArtistMatch[] {
		return this.store.actRow() === index ? this.store.actMatches() : [];
	}

	/**
	 * What an act row's field gave back: the typed text while a name is being
	 * written, the artist itself once one is picked from the list.
	 */
	protected onAct(index: number, value: string | ConcertArtistMatch): void {
		if (typeof value === 'string') {
			this.store.setAct(index, value);
		} else if (value) {
			this.store.pickAct(index, value);
		} else {
			this.store.setAct(index, '');
		}
	}

	/** The venue list the concert form picks from, as the select wants it. */
	protected venueOptions(): { label: string; value: string }[] {
		return this.store.openVenues().map((venue) => ({
			label: venue.city ? `${venue.name} — ${venue.city}` : venue.name,
			value: venue.uid,
		}));
	}

	protected value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	/** An empty field is stored as null, not as an empty string. */
	protected optional(event: Event): string | null {
		return this.value(event).trim() || null;
	}

	/**
	 * Picking a venue fills the name and the city from it: the stored name is
	 * what the public row shows even when the venue document later moves.
	 */
	protected onVenue(uid: string): void {
		const venue = this.store
			.openVenues()
			.find((candidate) => candidate.uid === uid);

		this.store.setConcertField({
			venueUid: venue?.uid ?? null,
			venueName: venue?.name ?? '',
			city: venue?.city ?? null,
		});
	}

	/** How certain the model said it was, as a percentage for the chip. */
	protected confidence(suggestion: ConcertSuggestionEntity): string | null {
		return suggestion.confidence === null
			? null
			: `${Math.round(suggestion.confidence * 100)}%`;
	}

	protected isRetired(venue: VenueEntity): boolean {
		return venue.active === false;
	}
}
