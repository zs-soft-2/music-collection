import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PlayAlbumButtonComponent } from './play-album-button.component';
import { NowPlaying, PlayerStore } from './player.store';

const ALBUM = 'album-1';

/** Just enough of the player for a card's buttons to be drawn. */
function playerHolding(sources: {
	spotify?: string[];
	youtube?: string[];
	now?: NowPlaying | null;
	loadingAlbumId?: string | null;
	loadingSource?: 'spotify' | 'youtube' | null;
}) {
	return {
		playableSources: signal({
			spotify: new Set(sources.spotify ?? []),
			youtube: new Set(sources.youtube ?? []),
		}),
		now: signal(sources.now ?? null),
		loadingAlbumId: signal(sources.loadingAlbumId ?? null),
		loadingSource: signal(sources.loadingSource ?? null),
		playAlbum: jest.fn(),
		togglePlay: jest.fn(),
	};
}

type Player = ReturnType<typeof playerHolding>;

function render(player: Player): ComponentFixture<PlayAlbumButtonComponent> {
	TestBed.configureTestingModule({
		imports: [PlayAlbumButtonComponent],
		providers: [
			provideI18nTesting(),
			{ provide: PlayerStore, useValue: player },
		],
	});
	const fixture = TestBed.createComponent(PlayAlbumButtonComponent);
	fixture.componentRef.setInput('albumId', ALBUM);
	fixture.componentRef.setInput('title', 'V');
	fixture.detectChanges();

	return fixture;
}

const buttons = (fixture: ComponentFixture<PlayAlbumButtonComponent>) =>
	Array.from(
		fixture.nativeElement.querySelectorAll('button')
	) as HTMLButtonElement[];

describe('PlayAlbumButtonComponent', () => {
	afterEach(() => TestBed.resetTestingModule());

	// A button that could only disappoint is never offered: the card of a
	// record this player cannot start stays a plain card.
	it('offers nothing for a record it cannot start', () => {
		expect(buttons(render(playerHolding({})))).toHaveLength(0);
	});

	it('offers the green button alone for a Spotify record', () => {
		const only = buttons(render(playerHolding({ spotify: [ALBUM] })));

		expect(only).toHaveLength(1);
		expect(only[0].classList.contains('spotify')).toBe(true);
	});

	it('offers the red button alone for a YouTube record', () => {
		const only = buttons(render(playerHolding({ youtube: [ALBUM] })));

		expect(only).toHaveLength(1);
		expect(only[0].classList.contains('youtube')).toBe(true);
	});

	it('offers both, green first, for a record on both', () => {
		const both = buttons(
			render(playerHolding({ spotify: [ALBUM], youtube: [ALBUM] }))
		);

		expect(both.map((button) => button.className)).toEqual([
			expect.stringContaining('spotify'),
			expect.stringContaining('youtube'),
		]);
	});

	it('plays on the source whose colour was pressed', () => {
		const player = playerHolding({ spotify: [ALBUM], youtube: [ALBUM] });
		const fixture = render(player);

		buttons(fixture)[1].click();

		expect(player.playAlbum).toHaveBeenCalledWith(ALBUM, 'youtube');
	});

	it('pauses the source that is playing rather than starting it again', () => {
		const player = playerHolding({
			spotify: [ALBUM],
			youtube: [ALBUM],
			now: {
				source: 'youtube',
				title: 'V',
				subtitle: 'Havok',
				coverUrl: null,
				playing: true,
				albumId: ALBUM,
				trackId: null,
			},
		});
		const fixture = render(player);
		const [green, red] = buttons(fixture);

		expect(red.querySelector('.pi-pause')).toBeTruthy();
		expect(green.querySelector('.pi-play')).toBeTruthy();

		red.click();

		expect(player.togglePlay).toHaveBeenCalled();
		expect(player.playAlbum).not.toHaveBeenCalled();
	});

	// The queue and the radio name no source: it is the record being
	// fetched, not one colour of it.
	it('holds both buttons while a record with no named source loads', () => {
		const fixture = render(
			playerHolding({
				spotify: [ALBUM],
				youtube: [ALBUM],
				loadingAlbumId: ALBUM,
			})
		);

		expect(buttons(fixture).every((button) => button.disabled)).toBe(true);
	});

	it('holds only the button that was pressed', () => {
		const fixture = render(
			playerHolding({
				spotify: [ALBUM],
				youtube: [ALBUM],
				loadingAlbumId: ALBUM,
				loadingSource: 'spotify',
			})
		);

		expect(buttons(fixture).map((button) => button.disabled)).toEqual([
			true,
			false,
		]);
	});
});
