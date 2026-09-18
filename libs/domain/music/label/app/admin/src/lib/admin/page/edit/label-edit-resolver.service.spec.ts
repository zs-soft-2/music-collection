import { TestBed } from '@angular/core/testing';
import { LabelStateService } from '@music-collection/api';

import { LabelEditResolverService } from './label-edit-resolver.service';

describe('LabelEditResolverService', () => {
	let service: LabelEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				LabelEditResolverService,
				{ provide: LabelStateService, useValue: {} },
			],
		});

		service = TestBed.inject(LabelEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
