import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { CoverMosaicService } from '../../data/cover-mosaic';
import { CollectionArtworkComponent } from './collection-artwork.component';

describe('CollectionArtworkComponent', () => {
	const render = (inputs: {
		coverImageUrl?: string | null;
		covers?: string[];
		icon?: string | null;
	}): HTMLElement => {
		const fixture = TestBed.createComponent(CollectionArtworkComponent);

		fixture.componentRef.setInput(
			'coverImageUrl',
			inputs.coverImageUrl ?? null
		);
		fixture.componentRef.setInput('covers', inputs.covers ?? []);
		fixture.componentRef.setInput('icon', inputs.icon ?? null);
		fixture.detectChanges();

		return fixture.nativeElement as HTMLElement;
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [CollectionArtworkComponent],
			providers: [
				provideI18nTesting(),
				{
					provide: CoverMosaicService,
					useValue: {
						rotateSeconds: signal(0),
						turn: signal('fade'),
					},
				},
			],
		});
	});

	it("draws the curator's own artwork, covers or no covers", () => {
		const element = render({
			coverImageUrl: 'artwork.jpg',
			covers: ['cover.jpg'],
		});

		expect(element.querySelector('.cover')?.getAttribute('src')).toBe(
			'artwork.jpg'
		);
		expect(element.querySelector('mc-cover-mosaic')).toBeNull();
	});

	it('falls back to a mosaic of the records themselves', () => {
		const element = render({ covers: ['a.jpg', 'b.jpg'] });

		expect(element.querySelector('mc-cover-mosaic')).not.toBeNull();
		expect(element.querySelector('.placeholder')).toBeNull();
	});

	it("stands the collection's icon in when there is no picture at all", () => {
		const element = render({ icon: 'pi pi-star' });

		expect(
			element.querySelector('.placeholder')?.classList.contains('pi-star')
		).toBe(true);
	});
});
