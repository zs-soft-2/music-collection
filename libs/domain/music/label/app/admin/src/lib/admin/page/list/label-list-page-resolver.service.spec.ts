import { TestBed } from '@angular/core/testing';
import { LabelStateService } from '@music-collection/api';

import { LabelListPageResolverService } from './label-list-page-resolver.service';

let dispatchListEntitiesAction: jest.Mock;

describe('LabelListPageResolverService', () => {
	let service: LabelListPageResolverService;

	beforeEach(() => {
		dispatchListEntitiesAction = jest.fn();

		TestBed.configureTestingModule({
			providers: [
				LabelListPageResolverService,
				{
					provide: LabelStateService,
					useValue: {
						dispatchChangeNewEntityButtonEnabled: jest.fn(),
						dispatchListEntitiesAction,
						dispatchSetSelectedEntityIdAction: jest.fn(),
					},
				},
			],
		});
		service = TestBed.inject(LabelListPageResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('loads the labels the list opens on', () => {
		service.resolve();

		expect(dispatchListEntitiesAction).toHaveBeenCalled();
	});
});
