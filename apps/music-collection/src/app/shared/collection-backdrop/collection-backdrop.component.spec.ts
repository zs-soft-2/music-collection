import { TestBed } from '@angular/core/testing';

import { CollectionBackdropComponent } from './collection-backdrop.component';

describe('CollectionBackdropComponent', () => {
	const render = (inputs: {
		coverImageUrl?: string | null;
		covers?: string[];
		shade?: 'card' | 'hero';
	}) => {
		const fixture = TestBed.createComponent(CollectionBackdropComponent);

		fixture.componentRef.setInput(
			'coverImageUrl',
			inputs.coverImageUrl ?? null
		);
		fixture.componentRef.setInput('covers', inputs.covers ?? []);
		fixture.componentRef.setInput('shade', inputs.shade ?? 'card');
		fixture.detectChanges();

		return fixture;
	};

	beforeEach(() =>
		TestBed.configureTestingModule({
			imports: [CollectionBackdropComponent],
		})
	);

	it("stands the curator's artwork behind the card", () => {
		const element = render({
			coverImageUrl: 'artwork.jpg',
			covers: ['cover.jpg'],
		}).nativeElement as HTMLElement;

		expect(element.querySelector('img')?.getAttribute('src')).toBe(
			'artwork.jpg'
		);
	});

	it('falls back to the records themselves, four of them at most', () => {
		const element = render({
			covers: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'],
		}).nativeElement as HTMLElement;

		expect(element.querySelectorAll('.wall img')).toHaveLength(4);
	});

	it('draws nothing but the shade for a collection with no picture', () => {
		const element = render({}).nativeElement as HTMLElement;

		expect(element.querySelector('img')).toBeNull();
		expect(element.querySelector('.shade')).not.toBeNull();
	});

	it('falls back to the records when the artwork cannot be fetched', () => {
		const fixture = render({
			coverImageUrl: 'gone.jpg',
			covers: ['a.jpg', 'b.jpg'],
		});
		const element = fixture.nativeElement as HTMLElement;

		element.querySelector('img')?.dispatchEvent(new Event('error'));
		fixture.detectChanges();

		expect(element.querySelectorAll('.wall img')).toHaveLength(2);
	});

	/*
	 * A class on the host would be claimed by the page around it: the host
	 * element belongs to that page's template, so a page with a `.hero` of
	 * its own would lay the backdrop out as one — which is exactly what it
	 * did until the shade became an attribute.
	 */
	it('names its shade with an attribute rather than a class', () => {
		const host = render({ shade: 'hero' }).nativeElement as HTMLElement;

		expect(host.getAttribute('data-shade')).toBe('hero');
		expect(host.className).toBe('');
	});

	/*
	 * The curator's picture is shown and the wall of covers is blurred into
	 * a surface, which is two different sets of styles: the attribute is
	 * what tells them apart.
	 */
	it('says which of the two pictures it stands on', () => {
		expect(
			(
				render({ coverImageUrl: 'artwork.jpg', covers: ['a.jpg'] })
					.nativeElement as HTMLElement
			).getAttribute('data-source')
		).toBe('artwork');

		expect(
			(
				render({ covers: ['a.jpg'] }).nativeElement as HTMLElement
			).getAttribute('data-source')
		).toBe('wall');

		expect(
			(render({}).nativeElement as HTMLElement).getAttribute(
				'data-source'
			)
		).toBe('none');
	});

	it('falls back to the wall when the artwork breaks', () => {
		const fixture = render({
			coverImageUrl: 'gone.jpg',
			covers: ['a.jpg'],
		});
		const host = fixture.nativeElement as HTMLElement;

		host.querySelector('img')?.dispatchEvent(new Event('error'));
		fixture.detectChanges();

		expect(host.getAttribute('data-source')).toBe('wall');
	});
});
