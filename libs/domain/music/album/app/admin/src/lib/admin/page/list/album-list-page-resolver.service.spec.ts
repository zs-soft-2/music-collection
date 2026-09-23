import { TestBed } from '@angular/core/testing';
import { AlbumStateService } from '@music-collection/api';

import { AlbumListPageResolverService } from './album-list-page-resolver.service';

let dispatchListEntitiesAction: jest.Mock;

describe('AlbumListPageResolverService', () => {
	let service: AlbumListPageResolverService;

	beforeEach(() => {
		dispatchListEntitiesAction = jest.fn();

		TestBed.configureTestingModule({
			providers: [
				AlbumListPageResolverService,
				{
					provide: AlbumStateService,
					useValue: {
						dispatchChangeNewEntityButtonEnabled: jest.fn(),
						dispatchListEntitiesAction,
						dispatchSetSelectedEntityIdAction: jest.fn(),
					},
				},
			],
		});
		service = TestBed.inject(AlbumListPageResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('loads the albums the list opens on', () => {
		service.resolve();

		expect(dispatchListEntitiesAction).toHaveBeenCalled();
	});
});
