import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	DocumentCategoryEnum,
	DocumentEntity,
	DocumentFilterEnum,
	DocumentStateService,
	DocumentTableParams,
	DocumentUtilService,
	EntityTypeEnum,
} from '@music-collection/api';

import { DocumentTableService } from './document-table.service';

const document = (
	uid: string,
	updatedAt: number,
	rest: Partial<DocumentEntity> = {}
): DocumentEntity => ({
	uid,
	updatedAt,
	entityType: EntityTypeEnum.Document,
	name: uid,
	originalName: `${uid}.png`,
	filePath: `/document/${uid}`,
	fileType: 'image/png',
	...rest,
});

const upload = document('upload', 2);
const badge = document('badge', 3, { category: DocumentCategoryEnum.Badge });
const withdrawn = document('withdrawn', 1, {
	category: DocumentCategoryEnum.Badge,
	deletedAt: 42,
});

describe('DocumentTableService', () => {
	let service: DocumentTableService;
	let dispatchDeleteEntityAction: jest.Mock;

	const shown = (): string[] => {
		const emitted: DocumentTableParams[] = [];

		service.init$().subscribe((params) => emitted.push(params));

		return emitted[emitted.length - 1].documents.map(({ uid }) => uid);
	};

	beforeEach(() => {
		dispatchDeleteEntityAction = jest.fn();

		TestBed.configureTestingModule({
			providers: [
				DocumentTableService,
				provideRouter([]),
				{
					provide: DocumentStateService,
					useValue: {
						dispatchDeleteEntityAction,
						selectEntities$: jest.fn(() =>
							of([upload, badge, withdrawn])
						),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: DocumentUtilService, useValue: {} },
			],
		});

		service = TestBed.inject(DocumentTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('opens on the catalog, the last changed first', () => {
		expect(shown()).toEqual(['badge', 'upload']);
	});

	it('keeps the generated badges on their own tab', () => {
		service.setFilter(DocumentFilterEnum.Badge);

		expect(shown()).toEqual(['badge']);

		service.setFilter(DocumentFilterEnum.Other);

		expect(shown()).toEqual(['upload']);
	});

	it('shows the withdrawn documents on theirs alone', () => {
		service.setFilter(DocumentFilterEnum.Withdrawn);

		expect(shown()).toEqual(['withdrawn']);
	});

	it('withdraws nothing until the question is answered', () => {
		service.askWithdrawal(badge);

		expect(service.pendingWithdrawal()).toBe(badge);
		expect(dispatchDeleteEntityAction).not.toHaveBeenCalled();

		service.confirmWithdrawal();

		expect(dispatchDeleteEntityAction).toHaveBeenCalledWith(badge);
		expect(service.pendingWithdrawal()).toBeNull();
	});

	it('forgets the pending question when the tab changes', () => {
		service.askWithdrawal(badge);
		service.setFilter(DocumentFilterEnum.Other);

		expect(service.pendingWithdrawal()).toBeNull();
		expect(dispatchDeleteEntityAction).not.toHaveBeenCalled();
	});
});
