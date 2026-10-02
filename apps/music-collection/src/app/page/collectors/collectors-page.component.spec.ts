import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MusicCollectionEntity } from '@music-collection/domain/music-collection/api';
import { MusicCollectionEffect } from '@music-collection/domain/music-collection/core';
import { of } from 'rxjs';

import { CollectorCardDocument } from '../../data/collector-profile';
import { CollectorProfileEffect } from '../../data/collector-profile';

import { CollectorsPageComponent } from './collectors-page.component';

const card = (
	uid: string,
	displayName: string,
	slugs: string[],
	extra: Partial<CollectorCardDocument> = {}
): CollectorCardDocument =>
	({
		uid,
		displayName,
		copies: 100,
		points: 500,
		badges: slugs.map((slug) => ({
			slug,
			name: slug,
			imageUrl: null,
			points: 100,
		})),
		collecting: [],
		hasPage: true,
		updatedAt: 1,
		...extra,
	}) as CollectorCardDocument;

const definition = (slug: string, name = slug): MusicCollectionEntity =>
	({
		uid: slug,
		slug,
		name,
		description: null,
		icon: null,
		coverImageUrl: null,
		badge: null,
		status: 'published',
		group: null,
	}) as MusicCollectionEntity;

describe('CollectorsPageComponent', () => {
	let fixture: ComponentFixture<CollectorsPageComponent>;

	const render = (
		cards: CollectorCardDocument[],
		definitions: MusicCollectionEntity[] = []
	): HTMLElement => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			imports: [CollectorsPageComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: CollectorProfileEffect,
					useValue: { cards$: () => of(cards) },
				},
				{
					provide: MusicCollectionEffect,
					useValue: {
						listPublishedDefinitions$: () => of(definitions),
					},
				},
			],
		});

		fixture = TestBed.createComponent(CollectorsPageComponent);
		fixture.detectChanges();

		return fixture.nativeElement as HTMLElement;
	};

	/** The page opens on the collections; the wall of collectors is a tab. */
	const showCollectors = (host: HTMLElement): void => {
		host.querySelectorAll<HTMLButtonElement>('.views button')[1].click();
		fixture.detectChanges();
	};

	it('draws a collector with what they finished', () => {
		const host = render([card('u1', 'Zsolt', ['doom'])]);

		showCollectors(host);

		expect(host.querySelector('.who b')?.textContent).toContain('Zsolt');
		expect(host.querySelector('.badges .label')?.textContent).toContain(
			'doom'
		);
	});

	/** Every card is a way into that collector's own page. */
	it('leads to the collector the card is about', () => {
		const host = render([card('u1', 'Zsolt', ['doom'])]);

		showCollectors(host);

		expect(host.querySelector('.who')?.getAttribute('href')).toBe(
			'/collector/u1'
		);
	});

	it('narrows the wall to whoever finished one collection', () => {
		const host = render([
			card('u1', 'Zsolt', ['doom']),
			card('u2', 'Anna', ['bay-area']),
		]);
		showCollectors(host);

		const chips = host.querySelectorAll<HTMLButtonElement>('.chips button');

		// The first chip is "all"; the next is a collection somebody finished.
		chips[1].click();
		fixture.detectChanges();

		expect(host.querySelectorAll('.wall > li')).toHaveLength(1);
	});

	it('says so where a search finds nobody', () => {
		const host = render([card('u1', 'Zsolt', ['doom'])]);
		const search =
			host.querySelector<HTMLInputElement>('input[type=search]');

		if (search) {
			search.value = 'nobody';
			search.dispatchEvent(new Event('input'));
		}

		fixture.detectChanges();

		expect(host.querySelector('.wall')).toBeNull();
		expect(host.querySelector('.note')).not.toBeNull();
	});

	it('draws an empty wall where nobody shares a page', () => {
		const host = render([]);

		showCollectors(host);

		expect(host.querySelector('.wall')).toBeNull();
		expect(host.querySelector('.toolbar')).toBeNull();
	});

	/**
	 * Showing a collection is enough to be on the wall, and it is the smaller
	 * of the two consents: no shelf behind the name, so no numbers beside it.
	 * The name still leads somewhere — to the hunts they chose to show.
	 */
	it('names a collector who only shows a collection, and leads to them', () => {
		const host = render([
			card('u2', 'Anna', [], {
				collecting: [{ slug: 'doom', name: 'Doom' }],
				copies: 0,
				points: 0,
				hasPage: false,
			}),
		]);

		showCollectors(host);

		expect(host.querySelector('.who')?.getAttribute('href')).toBe(
			'/collector/u2'
		);
		expect(host.querySelector('.who b')?.textContent).toContain('Anna');
		expect(host.querySelector('.who .meta')).toBeNull();
	});

	/**
	 * And the collection is named under them. It is the only reason the row
	 * exists, so a row that said nothing but "no finished collection yet"
	 * would be withholding the one thing the collector did say.
	 */
	it('names the collection a collector is after', () => {
		const host = render([
			card('u2', 'Anna', [], {
				collecting: [{ slug: 'doom', name: 'Doom' }],
				hasPage: false,
			}),
		]);

		showCollectors(host);

		expect(host.querySelector('.pursuits .label')?.textContent).toContain(
			'Doom'
		);
		expect(host.querySelector('.wall .nothing')).toBeNull();
	});

	/** An entry written before the names travelled: the catalog names those. */
	it('names a hunt the entry only pointed at', () => {
		const host = render(
			[card('u2', 'Anna', [], { collecting: ['doom'] } as never)],
			[definition('doom', 'Doom Essentials')]
		);

		showCollectors(host);

		expect(host.querySelector('.pursuits .label')?.textContent).toContain(
			'Doom Essentials'
		);
	});

	/** And where neither names it, there is nothing a visitor could read. */
	it('leaves out a hunt nothing can name', () => {
		const host = render([
			card('u2', 'Anna', [], { collecting: ['gone'] } as never),
		]);

		showCollectors(host);

		expect(host.querySelector('.pursuits')).toBeNull();
		expect(host.querySelector('.wall .nothing')).not.toBeNull();
	});

	/**
	 * The other way round: the collections themselves, finished or not. A
	 * collection nobody has got to the end of is the one somebody might go
	 * and finish, and only this view can show it.
	 */
	describe('the collections', () => {
		it('names every published collection, including the untouched', () => {
			const host = render(
				[card('u1', 'Zsolt', ['doom'])],
				[definition('doom', 'Doom'), definition('glam', 'Glam Metal')]
			);

			expect(
				host.querySelectorAll('.collections-grid > li')
			).toHaveLength(2);
		});

		it('counts who finished one, and says where nobody has', () => {
			const host = render(
				[card('u1', 'Zsolt', ['doom']), card('u2', 'Anna', ['doom'])],
				[definition('doom', 'Doom'), definition('glam', 'Glam Metal')]
			);
			const cards = host.querySelectorAll('.collections-grid > li');

			expect(cards[0].querySelector('.finishers')?.textContent).toContain(
				'2'
			);
			expect(cards[1].querySelector('.nothing')).not.toBeNull();
		});

		it('opens the collectors of the collection that was asked about', () => {
			const host = render(
				[card('u1', 'Zsolt', ['doom']), card('u2', 'Anna', ['glam'])],
				[definition('doom', 'Doom'), definition('glam', 'Glam Metal')]
			);

			host.querySelector<HTMLButtonElement>('.finishers')?.click();
			fixture.detectChanges();

			expect(host.querySelectorAll('.wall > li')).toHaveLength(1);
			expect(host.querySelector('.who b')?.textContent).toContain(
				'Zsolt'
			);
		});

		it('leads to the collection own page', () => {
			const host = render([], [definition('doom', 'Doom')]);

			expect(
				host.querySelector('.collection')?.getAttribute('href')
			).toBe('/collections/doom');
		});
	});
});
