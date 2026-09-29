import { CollectionItemEntity, CountryEnum } from '@music-collection/api';

import { toReleaseView } from '../../shared/music-ui';

import { toRemovedCopy } from './collection-item.mapper';

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
