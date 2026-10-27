import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AuthenticationStateService,
	EntityRequest,
	EntityTypeEnum,
	ReleaseRequest,
	ReleaseStateService,
} from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { ReleaseRequestEffect } from '../../../data/release-request';
import { RequestEffect } from '../../../data/request';
import { RequestAdminComponent } from './request-admin.component';

const catalogRequest = {
	uid: 'r1',
	userId: 'u1',
	operation: 'create',
	target: {
		featureKey: 'artist',
		entityType: EntityTypeEnum.Artist,
		path: null,
		parentPath: null,
		ownedPath: null,
	},
	before: null,
	after: { name: 'Pozvakowski' },
	changes: [
		{ field: 'name', before: null, after: 'Pozvakowski', reference: null },
	],
	status: 'pending',
	baseUpdatedAt: null,
	note: null,
	createdAt: 1,
} as unknown as EntityRequest;

const releaseRequest = {
	uid: 'rr1',
	userId: 'u1',
	album: {
		uid: 'al1',
		name: 'Piramis II',
		artistUid: 'ar1',
		artistName: 'Piramis',
	},
	status: 'pending',
	discogsMasterId: null,
	discogsReleaseId: 42,
	pressing: {
		format: 'Vinyl, LP',
		label: 'Pepita',
		catno: 'SLPX 17561',
		country: 'Hungary',
		year: 1978,
	},
	note: null,
	createdAt: 2,
} as unknown as ReleaseRequest;

describe('RequestAdminComponent', () => {
	let fixture: ComponentFixture<RequestAdminComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [RequestAdminComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: RequestEffect,
					useValue: {
						listAll$: () => of([catalogRequest]),
						listAllResponses$: () => of([]),
						listUsers$: () => of([]),
						decide$: () => of({}),
					},
				},
				{
					provide: ReleaseRequestEffect,
					useValue: {
						listAll$: () => of([releaseRequest]),
						listUsers$: () => of([]),
						approve$: () => of({}),
						reject$: () => of(undefined),
					},
				},
				{
					provide: ReleaseStateService,
					useValue: {
						selectEntities$: () => of([]),
						dispatchListEntitiesAction: jest.fn(),
					},
				},
				{
					provide: AuthenticationStateService,
					useValue: {
						selectAuthenticatedUser$: () => of({ uid: 'admin-1' }),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(RequestAdminComponent);
		fixture.detectChanges();
	});

	const cards = (selector: string) =>
		fixture.nativeElement.querySelectorAll(selector);
	const kindChip = (label: string): HTMLButtonElement =>
		[...fixture.nativeElement.querySelectorAll('.chip.kind')].find((chip) =>
			(chip as HTMLElement).textContent?.includes(label)
		) as HTMLButtonElement;

	it('shows both kinds of request in one list', () => {
		expect(cards('mc-request-row')).toHaveLength(1);
		expect(cards('mc-release-request-row')).toHaveLength(1);
		expect(cards('.kind-tag')).toHaveLength(2);
	});

	it('leaves the other kind out when one is picked', () => {
		kindChip('Release request').click();
		fixture.detectChanges();

		expect(cards('mc-request-row')).toHaveLength(0);
		expect(cards('mc-release-request-row')).toHaveLength(1);
	});
});
