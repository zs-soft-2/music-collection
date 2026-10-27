import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CoverMosaicService } from '../../data/cover-mosaic';
import { CollectionEmblemComponent } from './collection-emblem.component';

describe('CollectionEmblemComponent', () => {
	const render = (inputs: {
		covers?: string[];
		coverImageUrl?: string | null;
		percentage?: number;
		mosaicFirst?: boolean;
		share?: boolean;
	}): HTMLElement => {
		const fixture = TestBed.createComponent(CollectionEmblemComponent);

		Object.entries({
			covers: [],
			coverImageUrl: null,
			percentage: 0,
			mosaicFirst: false,
			share: true,
			...inputs,
		}).forEach(([name, value]) =>
			fixture.componentRef.setInput(name, value)
		);
		fixture.detectChanges();

		return fixture.nativeElement as HTMLElement;
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [CollectionEmblemComponent],
			providers: [
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

	it('draws the records the collection is made of', () => {
		const element = render({ covers: ['a.jpg', 'b.jpg'] });

		expect(element.querySelector('mc-cover-mosaic')).not.toBeNull();
	});

	it('leaves the artwork to the card that already stands on it', () => {
		const element = render({
			covers: ['a.jpg'],
			coverImageUrl: 'artwork.jpg',
			mosaicFirst: true,
		});

		expect(element.querySelector('.cover')).toBeNull();
		expect(element.querySelector('mc-cover-mosaic')).not.toBeNull();
	});

	it('falls back to the artwork where there are no records to show', () => {
		const element = render({
			coverImageUrl: 'artwork.jpg',
			mosaicFirst: true,
		});

		expect(element.querySelector('.cover')?.getAttribute('src')).toBe(
			'artwork.jpg'
		);
	});

	it('says how far the shelf gets, unless the card says it elsewhere', () => {
		expect(
			render({ percentage: 40 }).querySelector('.share')?.textContent
		).toContain('40%');
		expect(
			render({ percentage: 40, share: false }).querySelector('.share')
		).toBeNull();
	});
});
