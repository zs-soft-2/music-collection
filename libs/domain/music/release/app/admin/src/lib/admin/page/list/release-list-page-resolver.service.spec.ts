import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { ReleaseStateService } from '@music-collection/api';

import { ReleaseListPageResolverService } from './release-list-page-resolver.service';

let dispatchListEntitiesAction: jest.Mock;

describe('ReleaseListPageResolverService', () => {
	let service: ReleaseListPageResolverService;

	beforeEach(() => {
		dispatchListEntitiesAction = jest.fn();

		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				ReleaseListPageResolverService,
				{
					provide: ReleaseStateService,
					useValue: {
						dispatchChangeNewEntityButtonEnabled: jest.fn(),
						dispatchListEntitiesAction,
						dispatchSetSelectedEntityIdAction: jest.fn(),
					},
				},
			],
		});
		service = TestBed.inject(ReleaseListPageResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('loads the releases the list opens on', () => {
		service.resolve();

		expect(dispatchListEntitiesAction).toHaveBeenCalled();
	});
});
