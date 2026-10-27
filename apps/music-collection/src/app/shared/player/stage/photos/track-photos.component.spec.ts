import { ComponentFixture, TestBed } from '@angular/core/testing';

import { type TrackImage } from '@music-collection/api';
import { TrackPhotosComponent } from './track-photos.component';

/** Three pictures, so there is a crossing to watch and one left waiting. */
const PHOTOS = ['a', 'b', 'c'].map(
	(uid) => ({ uid, filePath: `https://pics.test/${uid}.webp` }) as TrackImage
);

function render(
	positionSeconds: number,
	moving = true
): ComponentFixture<TrackPhotosComponent> {
	TestBed.configureTestingModule({ imports: [TrackPhotosComponent] });

	const fixture = TestBed.createComponent(TrackPhotosComponent);
	fixture.componentRef.setInput('photos', PHOTOS);
	fixture.componentRef.setInput('positionSeconds', positionSeconds);
	fixture.componentRef.setInput('moving', moving);
	fixture.detectChanges();

	return fixture;
}

function layers(fixture: ComponentFixture<TrackPhotosComponent>) {
	return Array.from(
		fixture.nativeElement.querySelectorAll('img.photo')
	) as HTMLImageElement[];
}

describe('TrackPhotosComponent', () => {
	it('holds every picture in the page, one of them up', () => {
		const shown = layers(render(1)).map((img) => img.style.opacity);

		expect(shown).toEqual(['1', '0', '0']);
	});

	/*
	 * Mid-crossing of the first turn: the second picture is arriving over
	 * the first, and the third is still waiting its turn.
	 */
	it('lifts the arriving picture over the one it replaces', () => {
		const [first, second, third] = layers(render(6.7));

		expect(Number(second.style.zIndex)).toBeGreaterThan(
			Number(first.style.zIndex)
		);
		expect(third.style.opacity).toBe('0');
	});

	it('crosses the next turn differently from this one', () => {
		const fixture = render(6.7);
		const look = () =>
			layers(fixture)
				.map((img) => `${img.style.transform} ${img.style.clipPath}`)
				.join('|');

		const first = look();
		fixture.componentRef.setInput('positionSeconds', 13.7);
		fixture.detectChanges();

		expect(look()).not.toBe(first);
	});

	/*
	 * The sixth crossing is the mosaic one; 41.3s is halfway through it.
	 * It is the sixth turn too, so of three pictures the third is the one
	 * coming apart and the first is the one arriving underneath it.
	 */
	it('breaks the picture into tiles on the turn that asks for it', () => {
		const fixture = render(41.3);
		const mosaic = fixture.nativeElement.querySelector('mc-photo-mosaic');

		expect(mosaic).not.toBeNull();
		expect(mosaic.querySelectorAll('span.tile').length).toBeGreaterThan(1);

		const [arriving, waiting, breaking] = layers(fixture);

		expect(breaking.style.opacity).toBe('0');
		expect(arriving.style.opacity).toBe('1');
		expect(waiting.style.opacity).toBe('0');
	});

	it('keeps the tiles out of the page the rest of the time', () => {
		const fixture = render(6.7);
		const tiled = () =>
			fixture.nativeElement.querySelector('mc-photo-mosaic') !== null;

		expect(tiled()).toBe(false);

		// The mosaic's own turn, but before its crossing has started.
		fixture.componentRef.setInput('positionSeconds', 38);
		fixture.detectChanges();

		expect(tiled()).toBe(false);
	});

	it('sinks the picture through one turn and lifts it through the next', () => {
		const fixture = render(1);
		const height = (layer: number) => {
			const [translate] =
				layers(fixture)[layer].style.transform.split(')');

			return Number(translate.split(',')[1].replace('%', ''));
		};
		const at = (seconds: number, layer: number) => {
			fixture.componentRef.setInput('positionSeconds', seconds);
			fixture.detectChanges();

			return height(layer);
		};

		// The first picture's turn: it is making its way down the frame.
		expect(at(5, 0)).toBeGreaterThan(at(1, 0));
		// The second's, which is the same journey back up again.
		expect(at(12, 1)).toBeLessThan(at(8, 1));
	});

	it('leaves the pictures where they are when nothing may move', () => {
		for (const img of layers(render(6.7, false))) {
			expect(img.style.transform).toBe('translate(0%, 0%) scale(1)');
			expect(img.style.filter).toBe('none');
		}
	});
});
