import { ComponentFixture, TestBed } from '@angular/core/testing';

import { type TrackImage } from '@music-collection/api';
import { TrackImageBackdropComponent } from './track-image-backdrop.component';

const IMAGES = ['a', 'b', 'c'].map(
	(uid) => ({ uid, filePath: `https://pics.test/${uid}.webp` }) as TrackImage
);

function render(
	images: TrackImage[] = IMAGES
): ComponentFixture<TrackImageBackdropComponent> {
	TestBed.configureTestingModule({
		imports: [TrackImageBackdropComponent],
	});

	const fixture = TestBed.createComponent(TrackImageBackdropComponent);
	fixture.componentRef.setInput('images', images);
	fixture.detectChanges();

	return fixture;
}

function shots(fixture: ComponentFixture<TrackImageBackdropComponent>) {
	return Array.from(
		fixture.nativeElement.querySelectorAll('img.shot')
	) as HTMLImageElement[];
}

function mosaic(fixture: ComponentFixture<TrackImageBackdropComponent>) {
	return fixture.nativeElement.querySelector('mc-photo-mosaic');
}

/** Where the header's clock has got to, so a turn can be landed on exactly. */
let elapsed = 0;

function advance(
	fixture: ComponentFixture<TrackImageBackdropComponent>,
	ms: number
): void {
	jest.advanceTimersByTime(ms);
	elapsed += ms;
	fixture.detectChanges();
}

/**
 * On to the next turn of the header's own clock, and a little way into the
 * crossing it starts — landed on exactly, because a turn taken late would
 * find the crossing already over.
 */
function turnOver(
	fixture: ComponentFixture<TrackImageBackdropComponent>,
	intoCrossing = 300
): void {
	advance(fixture, (Math.floor(elapsed / 7000) + 1) * 7000 - elapsed);
	advance(fixture, intoCrossing);
}

describe('TrackImageBackdropComponent', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		elapsed = 0;
	});
	afterEach(() => jest.useRealTimers());

	it('holds every picture in the header, one of them up', () => {
		const fixture = render();

		expect(shots(fixture).map((shot) => shot.style.opacity)).toEqual([
			'1',
			'0',
			'0',
		]);
		// Nothing is coming apart until a picture is actually changing.
		expect(mosaic(fixture)).toBeNull();
	});

	/* The picture on show breathes; the ones waiting are left standing. */
	it('moves only the picture that is up', () => {
		const [up, waiting] = shots(render());

		expect(up.classList).toContain('up');
		expect(waiting.classList).not.toContain('up');
	});

	it('breaks the picture apart when the next one comes up', () => {
		const fixture = render();

		turnOver(fixture);

		const tiles = mosaic(fixture);

		expect(tiles).not.toBeNull();
		expect(tiles.querySelectorAll('span.tile').length).toBeGreaterThan(1);
		// The one arriving is whole underneath the tiles of the one going.
		expect(shots(fixture)[1].style.opacity).toBe('1');
		expect(shots(fixture)[0].style.opacity).toBe('0');
	});

	it('takes the tiles back out once the crossing is over', () => {
		const fixture = render();

		turnOver(fixture);
		expect(mosaic(fixture)).not.toBeNull();

		advance(fixture, 1400);

		expect(mosaic(fixture)).toBeNull();
	});

	it('breaks each change up its own way', () => {
		const fixture = render();
		const look = () =>
			Array.from(mosaic(fixture).querySelectorAll('span.tile'))
				.map((tile) => (tile as HTMLElement).style.opacity)
				.join('|');

		turnOver(fixture);
		const first = look();

		turnOver(fixture);

		expect(look()).not.toBe(first);
	});

	it('leaves a single picture alone', () => {
		const fixture = render([IMAGES[0]]);

		turnOver(fixture);

		expect(mosaic(fixture)).toBeNull();
		expect(shots(fixture)[0].style.opacity).toBe('1');
	});

	/* A list that shrank must not leave the header on a picture it lost. */
	it('comes back to the first picture when the list changes under it', () => {
		const fixture = render();

		turnOver(fixture);
		fixture.componentRef.setInput('images', [IMAGES[0]]);
		fixture.detectChanges();

		expect(mosaic(fixture)).toBeNull();
		expect(shots(fixture)[0].style.opacity).toBe('1');
	});
});
