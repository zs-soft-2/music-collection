import {
	CollectionItemEntity,
	CountryEnum,
	ReleaseEntity,
} from '@music-collection/api';

import { toReleaseView } from '../../shared/music-ui';

import { toPressingOptions, toRemovedCopy } from './collection-item.mapper';

/** A copy of a real pressing: a 180g German reissue on a named label. */
function copy(fields: Record<string, unknown> = {}): CollectionItemEntity {
	return {
		uid: 'c1',
		userId: 'u1',
		date: 0,
		release: {
			uid: 'r1',
			name: 'Painkiller',
			media: 'vinyl',
			formatDescription: ['LP', 'Album', 'Reissue', '180g'],
			label: { name: 'Columbia' },
			country: CountryEnum.Germany,
			generic: false,
			album: { uid: 'a1', name: 'Painkiller', year: 1990 },
			artist: { uid: 'ar1', name: 'Judas Priest' },
			...fields,
		},
	} as unknown as CollectionItemEntity;
}

describe('toRemovedCopy', () => {
	/**
	 * The shelf and the album page hand the removal dialog the record's own
	 * view; the copy page has no such view and maps one here. The two must
	 * name the same pressing the same way, or the same record would read as
	 * 180g on two pages and as nothing on the third.
	 */
	it('names the pressing exactly as the record view does', () => {
		const item = copy();
		const { format, weight, generic, labelName, country } =
			toReleaseView(item);

		expect(toRemovedCopy(item)).toEqual({
			format,
			weight,
			generic,
			labelName,
			country,
		});
	});

	it('reads the weight off the format description', () => {
		expect(toRemovedCopy(copy()).weight).toBe(180);
		expect(
			toRemovedCopy(copy({ formatDescription: ['LP', 'Album'] })).weight
		).toBeNull();
	});

	/** The album on a medium, with no pressing behind it. */
	it('says so where only the format is known', () => {
		expect(
			toRemovedCopy(copy({ generic: true, label: null }))
		).toMatchObject({ generic: true, labelName: null });
	});
});

/** A release of the catalog, as the picker list reads them. */
function release(fields: Record<string, unknown> = {}): ReleaseEntity {
	return {
		uid: 'r1',
		name: 'Painkiller',
		media: 'vinyl',
		formatDescription: ['LP', 'Album'],
		label: { name: 'Columbia' },
		country: CountryEnum.Germany,
		generic: false,
		date: new Date('1990-09-03'),
		album: { uid: 'a1', name: 'Painkiller' },
		artist: { uid: 'ar1', name: 'Judas Priest' },
		...fields,
	} as unknown as ReleaseEntity;
}

describe('toPressingOptions', () => {
	it('offers only the releases of this album', () => {
		const options = toPressingOptions(
			[
				release(),
				release({
					uid: 'r2',
					album: { uid: 'a2', name: 'British Steel' },
				}),
			],
			'a1',
			'r1',
			new Set()
		);

		expect(options.map(({ id }) => id)).toEqual(['r1']);
	});

	/** The question the list answers first: which of these is mine. */
	it("marks the copy's own release and puts it first", () => {
		const options = toPressingOptions(
			[release({ uid: 'r2', date: new Date('1990-01-01') }), release()],
			'a1',
			'r1',
			new Set()
		);

		expect(options.map(({ id, current }) => [id, current])).toEqual([
			['r1', true],
			['r2', false],
		]);
	});

	/**
	 * Two copies under one pressing is a state the album page refuses to
	 * create, so the move must not create it either.
	 */
	it('marks a release another copy of the collector already stands under', () => {
		const options = toPressingOptions(
			[release(), release({ uid: 'r2' })],
			'a1',
			'r1',
			new Set(['r1', 'r2'])
		);

		expect(options.map(({ id, taken }) => [id, taken])).toEqual([
			['r1', false],
			['r2', true],
		]);
	});

	/** An archived pressing is no place to move a record onto... */
	it('leaves archived releases out', () => {
		const options = toPressingOptions(
			[release(), release({ uid: 'r2', active: false })],
			'a1',
			'r1',
			new Set()
		);

		expect(options.map(({ id }) => id)).toEqual(['r1']);
	});

	/** ...but a copy already standing on one has to be able to name it. */
	it('keeps the archived release the copy itself stands under', () => {
		const options = toPressingOptions(
			[release({ active: false })],
			'a1',
			'r1',
			new Set()
		);

		expect(options.map(({ id, current }) => [id, current])).toEqual([
			['r1', true],
		]);
	});

	/** The album on a medium is no pressing; it reads last. */
	it('sorts the generic releases behind the pressings', () => {
		const options = toPressingOptions(
			[
				release({
					uid: 'generic-a1-vinyl',
					generic: true,
					label: null,
				}),
				release({ uid: 'r2', date: new Date('2016-01-01') }),
				release({ uid: 'r3', date: new Date('1990-01-01') }),
			],
			'a1',
			null,
			new Set()
		);

		expect(options.map(({ id }) => id)).toEqual([
			'r3',
			'r2',
			'generic-a1-vinyl',
		]);
		expect(options[2]).toMatchObject({ generic: true, labelName: null });
	});

	it('reads the label, country, year and format description', () => {
		const [option] = toPressingOptions(
			[release({ formatDescription: ['LP', 'Album', '180g'] })],
			'a1',
			'r1',
			new Set()
		);

		expect(option).toMatchObject({
			labelName: 'Columbia',
			year: 1990,
			formatDescription: 'LP, Album, 180g',
			format: 'vinyl',
		});
		expect(option.country).toBeTruthy();
	});
});
