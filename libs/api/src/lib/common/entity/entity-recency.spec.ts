import { Entity } from './entity';
import { sortByRecent } from './entity-recency';
import { EntityTypeEnum } from './entity-type.enum';

const entity = (uid: string, updatedAt?: number): Entity => ({
	entityType: EntityTypeEnum.Artist,
	uid,
	updatedAt,
});

describe('sortByRecent', () => {
	it('puts the last changed first and the never stamped last', () => {
		const entities = [entity('a', 10), entity('b'), entity('c', 30)];

		expect(sortByRecent(entities).map(({ uid }) => uid)).toEqual([
			'c',
			'a',
			'b',
		]);
	});

	it('leaves the input untouched', () => {
		const entities = [entity('a', 10), entity('c', 30)];

		sortByRecent(entities);

		expect(entities.map(({ uid }) => uid)).toEqual(['a', 'c']);
	});
});
