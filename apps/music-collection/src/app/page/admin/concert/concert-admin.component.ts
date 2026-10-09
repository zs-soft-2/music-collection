import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	effect,
	inject,
	signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';
import {
	ACT_SEARCH_LENGTH,
	CONCERT_AI_DISABLED,
	CONCERT_AI_QUOTA,
	ConcertArtistMatch,
	ConcertDraft,
	ConcertEventType,
	VenueEntity,
} from '@music-collection/api';
import { normalizeCatalogName } from '@music-collection/common/engine';
import { VENUE_IN_USE } from '@music-collection/domain/concert';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { AutoComplete } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';

import { AiMarkComponent } from '../../../shared/music-ui';
// A teljes `data/user-location` barrel a helyadatok repositoryját is behozná,
// és ez a lap csak az ország-listát kéri: az atlasz 5 KB, a barrel nem.
import { countries, countryName } from '../../../data/user-location/countries';

import {
	ConcertAdminStore,
	ConcertAdminTab,
	ConcertLoadKey,
} from './concert-admin.store';

/** The kinds a night can be filed as, in the order the select offers them. */
const EVENT_TYPES: ConcertEventType[] = ['concert', 'festival', 'other'];

/** One counted thing from a run, as the card prints it. */
interface ReportRow {
	label: string;
	value: string;
	/** The number the run is about — the card draws this one stronger. */
	lead: boolean;
}

/**
 * What a card says about its own last run.
 *
 * Built here rather than in the store because all of it is wording: the store
 * holds what happened, this turns it into the sentence and the figures a
 * reader gets. One shape for all four loads, so the four cards report the same
 * way even though they count different things.
 */
interface LoadReport {
	state: 'running' | 'done' | 'error';
	/** Fut… / Kész / Nem sikerült, with the elapsed time while it runs. */
	headline: string;
	/** Which country, and when — a run outlives the picker above it. */
	meta: string;
	rows: ReportRow[];
	/**
	 * The sentence worth saying beside the figures: that nothing came back,
	 * or that some of the questions were never answered. A column of zeros
	 * does not say which of the two happened.
	 */
	note: string | null;
	/** Whether that sentence is about questions that failed outright. */
	noteFailed: boolean;
	error: string | null;
}

/**
 * Admin: the concerts of the catalog's bands, and the four loads that fill
 * them.
 *
 * The buttons are deliberately separate, because they do not cost the same
 * thing. The MusicBrainz venue load is a few hundred requests under a
 * one-per-second limit — slow, free, and rarely needed. The concert load is a
 * handful of requests and writes straight to the public page: every night it
 * files is anchored on an mbid. The two model runs are paid per request and
 * write nothing public at all; what they propose — venues and nights alike —
 * waits on its own tab until someone opens the cited source.
 *
 * That last step is the one worth explaining to whoever maintains this: there
 * is no free API for future concerts, and outside Hungary there is barely a
 * free one for venues either. A model with search grounding finds what a person
 * searching would find, and is wrong in the same ways — so a person reads it
 * first. Wherever that happens, the page says so: the same mark runs on the
 * model's loads, on its rows, and on the public page.
 *
 * One country for all four loads. The data was never Hungarian — only the
 * pages were written as if it had been — so widening it was a parameter, not a
 * migration.
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
		NgTemplateOutlet,
		AiMarkComponent,
		AutoComplete,
		Button,
		Checkbox,
		InputText,
		MultiSelect,
		Select,
	],
})
export class ConcertAdminComponent {
	protected readonly store = inject(ConcertAdminStore);

	/** From how many characters an act row asks the catalog. */
	protected readonly actSearchLength = ACT_SEARCH_LENGTH;

	private readonly transloco = inject(TranslocoService);

	/**
	 * Ticks while a load runs, so a card can count up with it.
	 *
	 * The MusicBrainz venue walk is a request a second and can take minutes; a
	 * spinner that says nothing for that long reads as a page that has hung.
	 * Nothing ticks while nothing runs.
	 */
	private readonly tick = signal(Date.now());

	protected readonly tabs: { key: ConcertAdminTab; labelKey: string }[] = [
		{ key: 'suggestions', labelKey: 'admin.concert.tab.suggestions' },
		{
			key: 'venue-suggestions',
			labelKey: 'admin.concert.tab.venue-suggestions',
		},
		{ key: 'concerts', labelKey: 'admin.concert.tab.concerts' },
		{ key: 'venues', labelKey: 'admin.concert.tab.venues' },
	];

	constructor() {
		// Csak futás közben ketyeg, és a futás végén magától leáll: az
		// `effect` takarítója viszi el az időzítőt.
		effect((onCleanup) => {
			if (!this.store.running()) {
				return;
			}

			const timer = setInterval(() => this.tick.set(Date.now()), 1000);

			onCleanup(() => clearInterval(timer));
		});
	}

	/**
	 * The countries every load may be pointed at, in the reader's own language.
	 *
	 * The whole list, not a hand-picked few: the data was never Hungarian —
	 * only the pages were written as if it had been — and a collector who moved
	 * to Vienna has the same question about Vienna. The names come from the
	 * browser, so there is no country list to keep translated.
	 */
	protected countryOptions(): { label: string; value: string }[] {
		return countries().map((country) => ({
			label: country.name,
			value: country.code,
		}));
	}

	/**
	 * What the card of `key` says about its own last run, or null before one
	 * has been started.
	 *
	 * Four loads, one report. Before this, a finished run left a grey half
	 * sentence above its button and a failed one left a line below the tabs,
	 * three screens from the button that caused it — so a run that answered
	 * and a run that never happened looked the same. Here every card says the
	 * same four things: whether it is running, how long for, what came back,
	 * and what it was about.
	 */
	protected report(key: ConcertLoadKey): LoadReport | null {
		const run = this.store.runs()[key];

		if (!run) {
			return null;
		}

		const running = run.state === 'running';
		const note = run.state === 'done' ? this.noteOf(key) : null;

		return {
			note: note?.text ?? null,
			noteFailed: !!note?.failed,
			error: run.error ? this.errorText(run.error) : null,
			headline: running
				? this.runText('running', {
						elapsed: this.elapsed(run.startedAt),
					})
				: this.runText(run.state === 'error' ? 'failed' : 'done'),
			meta: this.runText(running ? 'meta-running' : 'meta', {
				country: countryName(run.countryCode),
				time: this.clock(run.endedAt ?? run.startedAt),
			}),
			// A számok csak a sikeres futáséi. Egy elhasalt futás után a mezőn
			// még az előző futás eredménye ül: azt kiírni a „nem sikerült" alá
			// az volna, hogy a hibát számokkal cáfoljuk.
			rows: run.state === 'done' ? this.rowsOf(key) : [],
			state: run.state,
		};
	}

	/**
	 * A server error in words.
	 *
	 * The three the page knows by name are its own: a venue that cannot go
	 * because concerts point at it, and the model run switched off or out of
	 * budget. Anything else goes out as it came — a message written for no one
	 * still says more than „valami hiba történt".
	 */
	protected errorText(message: string): string {
		if (message === VENUE_IN_USE) {
			return this.transloco.translate('admin.concert.venue-in-use');
		}

		if (message.includes(CONCERT_AI_DISABLED)) {
			return this.transloco.translate('admin.concert.ai-disabled');
		}

		if (message.includes(CONCERT_AI_QUOTA)) {
			return this.transloco.translate('admin.concert.ai-quota');
		}

		return message;
	}

	/** What a finished run counted, in the order the card reads it. */
	private rowsOf(key: ConcertLoadKey): ReportRow[] {
		switch (key) {
			case 'venues': {
				const result = this.store.loadedVenues();

				return result
					? [
							this.row('scanned', result.scanned),
							this.row('venues', result.venues),
							this.row('written', result.written, true),
							this.row('unchanged', result.unchanged),
						]
					: [];
			}
			case 'ai-venues': {
				const result = this.store.suggestedVenues();

				return result
					? [
							this.row('asked', result.asked),
							this.row('seen', result.venuesSeen),
							this.row('suggested', result.suggested, true),
							this.row('duplicates', result.duplicates),
							this.row('rejected', result.rejected),
							this.row('discarded', result.discarded),
							...this.failedRow(result.failed),
							this.row('left', result.requestsLeft),
							this.row('model', result.model),
						]
					: [];
			}
			case 'concerts': {
				const result = this.store.loadedConcerts();

				return result
					? [
							this.row('artists', result.artistsQueried),
							this.row('events', result.eventsScanned),
							this.row('matched', result.matched),
							this.row('written', result.written, true),
							this.row('deleted', result.deleted),
							this.row('venues-created', result.venuesCreated),
						]
					: [];
			}
			case 'ai': {
				const result = this.store.suggested();

				return result
					? [
							this.row('queried', result.venuesQueried),
							this.row('seen', result.concertsSeen),
							this.row('proposed', result.proposed),
							this.row('suggested', result.suggested, true),
							this.row('duplicates', result.duplicates),
							this.row('rejected', result.rejected),
							this.row('discarded', result.discarded),
							...this.failedRow(result.failed),
							this.row('left', result.requestsLeft),
							this.row('model', result.model),
						]
					: [];
			}
		}
	}

	/**
	 * The unanswered-questions row, and only when there were any. A zero there
	 * on every ordinary run would teach the reader to stop looking at it.
	 */
	private failedRow(failed: number | undefined): ReportRow[] {
		return failed ? [this.row('failed', failed, true)] : [];
	}

	/**
	 * The sentence a run gets beside its figures.
	 *
	 * A column of zeros is a riddle: it does not say whether the question went
	 * out at all, whether the answer was empty, or whether everything it held
	 * was thrown away. The three read differently, so they are said
	 * differently — and the first of them, a question the model never
	 * answered, used to be visible only in the server's log.
	 */
	private noteOf(
		key: ConcertLoadKey
	): { failed: boolean; text: string } | null {
		switch (key) {
			case 'venues': {
				const result = this.store.loadedVenues();

				return result && result.venues === 0
					? { failed: false, text: this.runText('empty-venues') }
					: null;
			}
			case 'ai-venues': {
				const result = this.store.suggestedVenues();

				if (!result) {
					return null;
				}

				if (result.failed) {
					return this.failureNote(result.failed, result.failure);
				}

				if (result.venuesSeen === 0) {
					return {
						failed: false,
						text: this.runText('empty-ai-venues'),
					};
				}

				return result.suggested === 0
					? { failed: false, text: this.runText('nothing-new') }
					: null;
			}
			case 'concerts': {
				const result = this.store.loadedConcerts();

				return result && result.matched === 0
					? { failed: false, text: this.runText('empty-concerts') }
					: null;
			}
			case 'ai': {
				const result = this.store.suggested();

				if (!result) {
					return null;
				}

				if (result.failed) {
					return this.failureNote(result.failed, result.failure);
				}

				if (result.concertsSeen === 0) {
					return { failed: false, text: this.runText('empty-ai') };
				}

				return result.suggested === 0
					? { failed: false, text: this.runText('nothing-new') }
					: null;
			}
		}
	}

	/**
	 * What the card says about questions that went out and came back as an
	 * error. The server's own message goes with it where there is one: the
	 * difference between a model that is out of quota and a gateway that is
	 * down is the whole of what the admin can do next.
	 */
	private failureNote(
		failed: number,
		failure: string | null | undefined
	): { failed: boolean; text: string } {
		return {
			failed: true,
			text: failure
				? this.runText('failed-questions', {
						count: failed,
						message: this.errorText(failure),
					})
				: this.runText('failed-questions-plain', { count: failed }),
		};
	}

	private row(name: string, value: number | string, lead = false): ReportRow {
		return {
			label: this.transloco.translate(`admin.concert.run.row.${name}`),
			lead,
			value: `${value}`,
		};
	}

	private runText(name: string, params?: Record<string, unknown>): string {
		return this.transloco.translate(`admin.concert.run.${name}`, params);
	}

	/** How long the run has been going, as `perc:másodperc`. */
	private elapsed(startedAt: number): string {
		const seconds = Math.max(
			0,
			Math.round((this.tick() - startedAt) / 1000)
		);

		return `${Math.floor(seconds / 60)}:${`${seconds % 60}`.padStart(
			2,
			'0'
		)}`;
	}

	/** The clock time a run started or ended, in the reader's own format. */
	private clock(at: number): string {
		return new Date(at).toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
		});
	}

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

	/**
	 * The venue list to pick from: the concert form points a night at one of
	 * these, and the AI run is told which of them to ask about. Retired halls
	 * are left out of both — nothing is filed there, and a request spent on
	 * one is a request spent for nothing.
	 */
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

	/**
	 * How certain the model said it was, as a percentage for the chip. Takes a
	 * concert proposal and a venue proposal alike: it is the same number, and
	 * it orders the list rather than deciding anything.
	 */
	protected confidence(suggestion: {
		confidence: number | null;
	}): string | null {
		return suggestion.confidence === null
			? null
			: `${Math.round(suggestion.confidence * 100)}%`;
	}

	protected isRetired(venue: VenueEntity): boolean {
		return venue.active === false;
	}

	/** Whether a model proposed the venue — the row says so, like the page. */
	protected isFromModel(venue: VenueEntity): boolean {
		return venue.source === 'ai';
	}

	/**
	 * The cities of a typed-in list, as the venue proposal run takes them.
	 *
	 * A plain field rather than a picker, because there is nothing to pick
	 * from: the country has no venues yet — that is why it is being asked
	 * about — so its cities are not in the catalog either.
	 */
	protected onCities(event: Event): void {
		this.store.setAskCities(this.value(event).split(','));
	}
}
