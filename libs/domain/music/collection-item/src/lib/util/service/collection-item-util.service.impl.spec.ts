import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import {
	CollectionItemEntity,
	EntityTypeEnum,
	QueryOperatorEnum,
} from '@music-collection/api';

import { CollectionItemUtilServiceImpl } from './collection-item-util.service.impl';

const ITEM = {
	uid: 'item-1',
	userId: 'user-1',
	date: new Date(0),
	entityType: EntityTypeEnum.CollectionItem,
	release: { name: 'Animals', artist: { name: 'Pink Floyd' } },
} as CollectionItemEntity;

describe('CollectionItemUtilServiceImpl', () => {
	let service: CollectionItemUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), CollectionItemUtilServiceImpl],
		});
		service = TestBed.inject(CollectionItemUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('writes the artist next to the release name, each to search on its own', () => {
		const model = service.convertEntityToModel(ITEM);

		expect(model.searchParameters).toContain('animals');
		expect(model.artistSearchParameters).toEqual([
			'p',
			'pi',
			'pin',
			'pink',
			'pink ',
			'pink f',
			'pink fl',
			'pink flo',
			'pink floy',
			'pink floyd',
		]);
	});

	it('looks a searched artist up among the items own artists', () => {
		expect(
			service.createSearchParamsByArtist(
				EntityTypeEnum.CollectionItem,
				'Pink'
			)
		).toEqual([
			{
				entityType: EntityTypeEnum.CollectionItem,
				query: {
					queryConstraint: 'where',
					operation: QueryOperatorEnum.arrayContains,
					field: 'artistSearchParameters',
					value: 'pink',
				},
			},
		]);
	});
});
