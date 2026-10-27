import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { ArtistStateService } from '@music-collection/api';

import { ArtistListPageResolverService } from './artist-list-page-resolver.service';

let dispatchListEntitiesAction: jest.Mock;

describe('ArtistListPageResolverService', () => {
	let service: ArtistListPageResolverService;

	beforeEach(() => {
		dispatchListEntitiesAction = jest.fn();

		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				ArtistListPageResolverService,
				{
					provide: ArtistStateService,
					useValue: {
						dispatchChangeNewEntityButtonEnabled: jest.fn(),
						dispatchListEntitiesAction,
						dispatchSetSelectedEntityIdAction: jest.fn(),
					},
				},
			],
		});
		service = TestBed.inject(ArtistListPageResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('loads the artists the list opens on', () => {
		service.resolve();

		expect(dispatchListEntitiesAction).toHaveBeenCalled();
	});
});
