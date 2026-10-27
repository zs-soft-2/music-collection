import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOSAIC_TILES } from './mosaic';
import { PhotoMosaicComponent } from './photo-mosaic.component';

const SRC = 'https://pics.test/a.webp';

function render(
	fade: number,
	turn = 5
): ComponentFixture<PhotoMosaicComponent> {
	TestBed.configureTestingModule({ imports: [PhotoMosaicComponent] });

	const fixture = TestBed.createComponent(PhotoMosaicComponent);
	fixture.componentRef.setInput('src', SRC);
	fixture.componentRef.setInput('fade', fade);
	fixture.componentRef.setInput('turn', turn);
	fixture.detectChanges();

	return fixture;
}

function tiles(fixture: ComponentFixture<PhotoMosaicComponent>) {
	return Array.from(
		fixture.nativeElement.querySelectorAll('span.tile')
	) as HTMLElement[];
}

describe('PhotoMosaicComponent', () => {
	it('shows the whole picture as a grid of tiles', () => {
		const shown = tiles(render(0));

		expect(shown).toHaveLength(MOSAIC_TILES);
		expect(shown.every((tile) => tile.style.opacity === '1')).toBe(true);
	});

	/*
	 * Every tile is the same picture behind a window of its own, which is
	 * what lets it line up with the plain picture underneath.
	 */
	it('cuts every tile from the one picture', () => {
		const windows = tiles(render(0.5)).map((tile) => {
			const img = tile.querySelector('img') as HTMLImageElement;

			return `${img.getAttribute('src')} ${img.style.left} ${img.style.top}`;
		});

		expect(windows.every((cut) => cut.startsWith(SRC))).toBe(true);
		expect(new Set(windows).size).toBe(MOSAIC_TILES);
	});

	it('takes the tiles away as the crossing goes on', () => {
		const fixture = render(0.3);
		const standing = () =>
			tiles(fixture).filter((tile) => tile.style.opacity !== '0').length;

		const early = standing();
		fixture.componentRef.setInput('fade', 0.8);
		fixture.detectChanges();

		expect(standing()).toBeLessThan(early);
	});

	it('picks the picture up where the movement had got to', () => {
		const fixture = render(0.4);
		fixture.componentRef.setInput(
			'transform',
			'translate(0%, -2%) scale(1.1)'
		);
		fixture.detectChanges();

		expect(fixture.nativeElement.style.transform).toBe(
			'translate(0%, -2%) scale(1.1)'
		);
	});
});
