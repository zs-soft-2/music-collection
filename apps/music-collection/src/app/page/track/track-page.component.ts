import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
	parseSpotifyTrackId,
	parseYoutubeVideoId,
} from '@music-collection/api';

import { CoverBackdropComponent } from '../../shared/backdrop';
import { PlayerPanelComponent } from '../../shared/player';
import { TrackPageStore } from './track-page.store';
import { BackLinkComponent } from '../../shared/back-link';

interface TrackForm {
	spotify: string;
	youtube: string;
	writers: string;
	lyrics: string;
	synced: string;
}

/**
 * Track page: the app's player on the track, its credits and
 * lyrics (signed-in users only). Editable with the `updateTrackEntity`
 * permission.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [TrackPageStore],
	selector: 'mc-track-page',
	templateUrl: './track-page.component.html',
	styleUrls: ['./track-page.component.scss'],
	imports: [
		BackLinkComponent,
		RouterLink,
		CoverBackdropComponent,
		PlayerPanelComponent,
	],
})
export class TrackPageComponent {
	protected readonly store = inject(TrackPageStore);

	protected readonly editing = signal(false);
	protected readonly form = signal<TrackForm>({
		spotify: '',
		youtube: '',
		writers: '',
		lyrics: '',
		synced: '',
	});

	protected readonly spotifyInvalid = computed(() => {
		const value = this.form().spotify.trim();
		return !!value && !parseSpotifyTrackId(value);
	});

	protected readonly youtubeInvalid = computed(() => {
		const value = this.form().youtube.trim();
		return !!value && !parseYoutubeVideoId(value);
	});

	protected startEdit(): void {
		const track = this.store.track();
		this.form.set({
			spotify: this.store.spotifyTrackId()
				? `https://open.spotify.com/track/${this.store.spotifyTrackId()}`
				: '',
			youtube: this.store.youtubeVideoId()
				? `https://www.youtube.com/watch?v=${this.store.youtubeVideoId()}`
				: '',
			writers: (track?.writers ?? []).join(', '),
			lyrics: this.store.lyrics()?.text ?? '',
			synced: this.store.lyrics()?.synced ?? '',
		});
		this.editing.set(true);
	}

	protected setField(field: keyof TrackForm, event: Event): void {
		const value = (event.target as HTMLInputElement | HTMLTextAreaElement)
			.value;
		this.form.update((form) => ({ ...form, [field]: value }));
	}

	/** Fills the lyrics field from LRCLIB; saving stays with the admin. */
	protected async loadLyrics(): Promise<void> {
		const lyrics = await this.store.fetchExternalLyrics();
		if (lyrics) {
			this.form.update((form) => ({
				...form,
				lyrics: lyrics.text,
				synced: lyrics.synced ?? '',
			}));
		}
	}

	protected async save(): Promise<void> {
		if (this.spotifyInvalid() || this.youtubeInvalid()) {
			return;
		}
		const form = this.form();
		const saved = await this.store.save({
			spotifyTrackId: parseSpotifyTrackId(form.spotify),
			youtubeVideoId: parseYoutubeVideoId(form.youtube),
			writers: form.writers
				.split(',')
				.map((writer) => writer.trim())
				.filter(Boolean),
			lyrics: { text: form.lyrics, synced: form.synced },
		});
		if (saved) {
			this.editing.set(false);
		}
	}
}
