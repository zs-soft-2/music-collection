import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { CollectionItemStateService } from '@music-collection/api';

import { CollectionItemListPageResolverService } from './collection-item-list-page-resolver.service';

let dispatchListEntitiesAction: jest.Mock;

describe('CollectionItemListPageResolverService', () => {
	let service: CollectionItemListPageResolverService;

	beforeEach(() => {
		dispatchListEntitiesAction = jest.fn();

		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				CollectionItemListPageResolverService,
				{
					provide: CollectionItemStateService,
					useValue: {
						dispatchChangeNewEntityButtonEnabled: jest.fn(),
						dispatchListEntitiesAction,
						dispatchSetSelectedEntityIdAction: jest.fn(),
					},
				},
			],
		});
		service = TestBed.inject(CollectionItemListPageResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('loads the collection items the list opens on', () => {
		service.resolve();

		expect(dispatchListEntitiesAction).toHaveBeenCalled();
	});
});
