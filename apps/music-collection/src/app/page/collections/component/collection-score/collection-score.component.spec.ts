import { TestBed } from '@angular/core/testing';
import { MediaEnum } from '@music-collection/common/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { CollectionScoreView } from '../../collections.model';

import { CollectionScoreComponent } from './collection-score.component';

function view(
	overrides: Partial<CollectionScoreView> = {}
): CollectionScoreView {
	return {
		started: true,
		completed: true,
		total: 8,
		basePoints: 60,
		albumPoints: 94.25,
		sizeFactor: 1.5,
		formatFactor: 1,
		uniformMedia: null,
		points: 141,
		albums: [
			{
				albumUid: 'a',
				albumName: 'Kill ’Em All',
				media: MediaEnum.vinyl,
				rarity: 'rare',
				points: 16,
				copies: 2,
			},
			{
				albumUid: 'b',
				albumName: 'Bonded by Blood',
				media: null,
				rarity: null,
				points: 5,
				copies: 0,
			},
		],
		tip: null,
		...overrides,
	};
}

async function setUp(score: CollectionScoreView, signedIn = true) {
	await TestBed.configureTestingModule({
		imports: [CollectionScoreComponent],
		providers: [provideI18nTesting()],
	}).compileComponents();

	const fixture = TestBed.createComponent(CollectionScoreComponent);

	fixture.componentRef.setInput('score', score);
	fixture.componentRef.setInput('signedIn', signedIn);
	fixture.detectChanges();

	return fixture.nativeElement as HTMLElement;
}

const rows = (page: HTMLElement) =>
	[...page.querySelectorAll('.sum dd')].map((cell) =>
		cell.textContent?.trim()
	);

describe('CollectionScoreComponent', () => {
	it('shows the albums, both multipliers and the total', async () => {
		const page = await setUp(view());

		expect(rows(page).slice(0, 3)).toEqual(['94.25', '×1.50', '×1.00']);
		expect(page.querySelector('.total dd')?.textContent).toContain('141');
	});

	it('lists each album with the copy that counts for it', async () => {
		const page = await setUp(view());
		const [owned, missing] = [...page.querySelectorAll('.albums li')];

		expect(owned.querySelector('.album-points')?.textContent).toContain(
			'16'
		);
		expect(owned.querySelector('.tier')?.getAttribute('data-tier')).toBe(
			'rare'
		);
		expect(missing.classList).toContain('is-missing');
	});

	it('names the albums a set of a piece still misses', async () => {
		const page = await setUp(
			view({
				tip: {
					media: MediaEnum.vinyl,
					albumNames: ['Bonded by Blood', 'Eternal Nightmare'],
					minimumPoints: 222,
					gain: 81,
				},
			})
		);

		expect(page.querySelector('.tip')?.textContent).toContain(
			'Bonded by Blood, Eternal Nightmare'
		);
		expect(page.querySelector('.tip.is-done')).toBeNull();
	});

	it('says a set of a piece is one, rather than offering it again', async () => {
		const page = await setUp(
			view({ formatFactor: 1.5, uniformMedia: MediaEnum.vinyl })
		);

		expect(page.querySelector('.tip.is-done')).not.toBeNull();
	});

	it('shows only the base value while nothing is on the shelf', async () => {
		const page = await setUp(
			view({ started: false, completed: false, points: 60, albums: [] })
		);

		expect(rows(page)).toHaveLength(3);
		expect(page.querySelector('.albums')).toBeNull();
		expect(page.querySelector('.total dd')?.textContent).toContain('60');
	});

	it('tells a guest the working needs a shelf', async () => {
		const page = await setUp(view({ started: false, albums: [] }), false);

		expect(page.querySelector('.lead')).not.toBeNull();
	});
});
