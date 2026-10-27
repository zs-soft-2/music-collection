import { TestBed } from '@angular/core/testing';

import { CollectionPinComponent } from './collection-pin.component';

describe('CollectionPinComponent', () => {
	const render = (inputs: {
		badgeArtworkUrl?: string | null;
		icon?: string | null;
		percentage?: number;
		completed?: boolean;
		ring?: boolean;
	}): HTMLElement => {
		const fixture = TestBed.createComponent(CollectionPinComponent);

		Object.entries({
			badgeArtworkUrl: null,
			icon: null,
			percentage: 0,
			completed: false,
			ring: true,
			...inputs,
		}).forEach(([name, value]) =>
			fixture.componentRef.setInput(name, value)
		);
		fixture.detectChanges();

		return fixture.nativeElement as HTMLElement;
	};

	beforeEach(() =>
		TestBed.configureTestingModule({ imports: [CollectionPinComponent] })
	);

	it('shows the pin that was cast for the collection', () => {
		const element = render({ badgeArtworkUrl: 'pin.png' });

		expect(element.querySelector('.badge img')?.getAttribute('src')).toBe(
			'pin.png'
		);
	});

	it("stands the collection's icon in where no pin is cast yet", () => {
		const element = render({ icon: 'pi-star' });

		expect(
			element.querySelector('.badge i')?.classList.contains('pi-star')
		).toBe(true);
	});

	it('draws none of the ring on a shelf that has not started', () => {
		expect(render({ percentage: 0 }).querySelector('.fill')).toBeNull();
		expect(
			render({ percentage: 40 }).querySelector('.fill')
		).not.toBeNull();
	});

	it('leaves the ring out where the card says the progress itself', () => {
		expect(
			render({ percentage: 40, ring: false }).querySelector('svg')
		).toBeNull();
	});

	it('marks a finished collection, so the ring can turn gold', () => {
		expect(
			render({ completed: true }).classList.contains('is-completed')
		).toBe(true);
	});
});
