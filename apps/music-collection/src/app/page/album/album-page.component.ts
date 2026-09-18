import { ViewportScroller } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	AdminEditLinkComponent,
	DiscographyCardComponent,
	FormatBadgeComponent,
} from '../../shared/music-ui';
import {
	SpotifyIconComponent,
	SpotifyPanelComponent,
	SpotifyPlaybackStore,
} from '../../shared/spotify';
import {
	YoutubeIconComponent,
	YoutubePanelComponent,
	YoutubeAlbum,
	YoutubePlaybackStore,
} from '../../shared/youtube';
import { AlbumPageStore } from './album-page.store';
import { AlbumCreditsComponent } from './component/album-credits/album-credits.component';
import { AlbumTracklistComponent } from './component/album-tracklist/album-tracklist.component';

/**
 * Album page: the album with its original release, tracklist, credits
 * (musicians and their roles), the collector's copies and more albums of the
 * artist.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AlbumPageStore],
	selector: 'mc-album-page',
	templateUrl: './album-page.component.html',
	styleUrls: ['./album-page.component.scss'],
	imports: [
		RouterLink,
		DiscographyCardComponent,
		FormatBadgeComponent,
		AlbumCreditsComponent,
		AlbumTracklistComponent,
		SpotifyIconComponent,
		SpotifyPanelComponent,
		YoutubeIconComponent,
		YoutubePanelComponent,
		AdminEditLinkComponent,
	],
})
export class AlbumPageComponent {
	protected readonly store = inject(AlbumPageStore);
	protected readonly spotify = inject(SpotifyPlaybackStore);
	protected readonly youtube = inject(YoutubePlaybackStore);
	/** Full Spotify playback when signed in, otherwise the YouTube playlist. */
	private readonly playsOnSpotify = computed(
		() => this.spotify.connected() && !!this.store.album()?.spotifyAlbumId
	);

	protected readonly playable = computed(
		() => this.playsOnSpotify() || !!this.store.album()?.youtubePlaylistId
	);

	/** The album for the YouTube player, when it has anything on YouTube. */
	protected readonly youtubeAlbum = computed<YoutubeAlbum | null>(() => {
		const album = this.store.album();
		if (
			!album ||
			(!album.youtubePlaylistId && !album.youtubeVideoIds.length)
		) {
			return null;
		}
		return {
			uid: album.id,
			title: album.title,
			artistName: album.artistName,
			coverUrl: album.coverUrl,
			items: [
				...(album.youtubePlaylistId
					? [
							{
								kind: 'playlist' as const,
								id: album.youtubePlaylistId,
							},
						]
					: []),
				...album.youtubeVideoIds.map((id) => ({
					kind: 'video' as const,
					id,
				})),
			],
			trackNames: this.store.tracks().map((track) => track.name),
		};
	});

	/** Our id of the track playing now. */
	protected readonly playingTrackId = computed(() => {
		if (this.playsOnSpotify()) {
			return this.spotify.playingTrackId();
		}
		const index = this.youtube.playlistIndex();
		return this.youtube.album()?.uid === this.store.album()?.id &&
			this.youtube.selection()?.kind === 'playlist' &&
			index !== null
			? (this.store.tracks()[index]?.uid ?? null)
			: null;
	});

	private readonly viewportScroller = inject(ViewportScroller);

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);

	public constructor() {
		// Moving to another album of the artist reuses this page.
		effect(() => {
			this.store.albumId();
			untracked(() => this.viewportScroller.scrollToPosition([0, 0]));
		});

		// Signed in to Spotify: map the tracklist to the Spotify album's tracks.
		effect(() => {
			const spotifyAlbumId = this.store.album()?.spotifyAlbumId;
			const tracks = this.store.tracks();
			if (this.spotify.connected() && spotifyAlbumId && tracks.length) {
				untracked(() =>
					this.spotify.loadAlbumTracks(
						spotifyAlbumId,
						tracks.map(({ uid, name, index }) => ({
							id: uid,
							name,
							index,
						}))
					)
				);
			}
		});
	}

	protected playTrack(trackId: string): void {
		const album = this.store.album();
		if (!album) {
			return;
		}
		if (this.playsOnSpotify() && album.spotifyAlbumId) {
			void this.spotify.play(album.spotifyAlbumId, trackId);
		} else if (album.youtubePlaylistId) {
			// The YouTube Music album lists the tracks in album order.
			const index = this.store
				.tracks()
				.findIndex((track) => track.uid === trackId);
			const youtubeAlbum = this.youtubeAlbum();
			if (index >= 0 && youtubeAlbum) {
				if (this.youtube.album()?.uid !== youtubeAlbum.uid) {
					this.youtube.switchTo(youtubeAlbum);
				}
				this.youtube.playTrack(index);
			}
		}
	}
}
