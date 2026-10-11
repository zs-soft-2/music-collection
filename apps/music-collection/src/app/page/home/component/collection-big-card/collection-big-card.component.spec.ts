import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { CoverMosaicService } from '../../../../data/cover-mosaic';
import { CollectionBigCardView } from '../../home.model';
import { CollectionBigCardComponent } from './collection-big-card.component';

function view(
	overrides: Partial<CollectionBigCardView> = {}
): CollectionBigCardView {
	return {
		uid: 'glam',
		slug: 'glam',
		name: 'Glam Metal',
		description: null,
		icon: null,
		coverImageUrl: null,
		badgeName: null,
		badgeArtworkUrl: null,
		owned: 9,
		total: 119,
		missing: 110,
		percentage: 8,
		completed: false,
		points: 7157,
		earnedPoints: 0,
		bonusPoints: 0,
		covers: ['a.jpg', 'b.jpg'],
		group: null,
		finishers: [],
		finisherCount: 0,
		hunters: [],
		hunterCount: 0,
		followed: false,
		chips: ['Glam Metal'],
		...overrides,
	};
}

describe('CollectionBigCardComponent', () => {
	const render = (inputs: {
		weekly?: boolean;
		siblings?: string[];
		index?: number;
		collection?: CollectionBigCardView;
		signedIn?: boolean;
	}) => {
		const fixture = TestBed.createComponent(CollectionBigCardComponent);

		fixture.componentRef.setInput(
			'collection',
			inputs.collection ?? view()
		);
		fixture.componentRef.setInput('weekly', inputs.weekly ?? true);
		fixture.componentRef.setInput('siblings', inputs.siblings ?? []);
		fixture.componentRef.setInput('index', inputs.index ?? 0);
		fixture.componentRef.setInput('signedIn', inputs.signedIn ?? true);
		fixture.detectChanges();

		return fixture;
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [CollectionBigCardComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
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

	it('stands the collection on its own picture and its own pin', () => {
		const element = render({
			collection: view({
				coverImageUrl: 'artwork.jpg',
				badgeArtworkUrl: 'pin.png',
			}),
		}).nativeElement as HTMLElement;

		expect(element.querySelector('mc-collection-backdrop')).not.toBeNull();
		// A borítóra rajzolt kártyán a jel a lemezeké, nem ugyanaz a kép.
		expect(
			element.querySelector('mc-collection-emblem mc-cover-mosaic')
		).not.toBeNull();
		expect(
			element.querySelector('mc-collection-pin .badge img')
		).not.toBeNull();
	});

	/*
	 * A guest has no shelf, and `0%` over an empty ring reads as a
	 * collection nobody got anywhere with rather than as nobody signed in.
	 */
	it('measures nobody who has no shelf', () => {
		const element = render({ signedIn: false })
			.nativeElement as HTMLElement;

		expect(element.querySelector('.bar')).toBeNull();
		expect(element.querySelector('.counts')).toBeNull();
		expect(element.querySelector('mc-collection-pin svg')).toBeNull();
		expect(element.querySelector('mc-collection-emblem .share')).toBeNull();
	});

	/*
	 * "I'm collecting this" said to a guest is a claim about a collector who
	 * is not there; what they are offered is the way in.
	 */
	it('asks a guest in rather than letting them star it', () => {
		const fixture = render({ signedIn: false });
		const element = fixture.nativeElement as HTMLElement;
		const asked: string[] = [];

		fixture.componentInstance.follow.subscribe(() => asked.push('follow'));
		fixture.componentInstance.signIn.subscribe(() => asked.push('signIn'));

		element
			.querySelectorAll<HTMLButtonElement>('.actions button')[0]
			.click();

		expect(asked).toEqual(['signIn']);
	});

	it('says how far a signed-in collector gets', () => {
		const element = render({}).nativeElement as HTMLElement;

		expect(element.querySelector('.bar')).not.toBeNull();
		expect(element.querySelector('.counts')?.textContent).toContain(
			'9 / 119'
		);
	});

	it('offers no switcher where there is nothing to switch to', () => {
		const element = render({ siblings: ['Glam Metal'] })
			.nativeElement as HTMLElement;

		expect(element.querySelector('.switch')).toBeNull();
	});

	it('marks which of them is on show', () => {
		const element = render({
			siblings: ['Glam Metal', 'Doom', 'Bay Area'],
			index: 1,
		}).nativeElement as HTMLElement;
		const dots = element.querySelectorAll<HTMLButtonElement>('.dot');

		expect(dots).toHaveLength(3);
		expect(dots[1].classList.contains('is-on')).toBe(true);
		expect(dots[1].getAttribute('aria-current')).toBe('true');
		expect(dots[2].getAttribute('aria-label')).toBe('Bay Area');
	});

	it('asks the page to turn the card rather than turning it itself', () => {
		const fixture = render({
			siblings: ['Glam Metal', 'Doom', 'Bay Area'],
			index: 0,
		});
		const element = fixture.nativeElement as HTMLElement;
		const turned: string[] = [];

		fixture.componentInstance.previous.subscribe(() =>
			turned.push('previous')
		);
		fixture.componentInstance.next.subscribe(() => turned.push('next'));
		fixture.componentInstance.show.subscribe((at) =>
			turned.push(`show:${at}`)
		);

		element.querySelectorAll<HTMLButtonElement>('.arrow')[0].click();
		element.querySelectorAll<HTMLButtonElement>('.arrow')[1].click();
		element.querySelectorAll<HTMLButtonElement>('.dot')[2].click();

		expect(turned).toEqual(['previous', 'next', 'show:2']);
	});
});
