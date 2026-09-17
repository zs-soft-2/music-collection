import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	ArtistStateService,
	LabelStateService,
	ReleaseStateService,
	ReleaseUtilService,
} from '@music-collection/api';

import { ReleaseUtilServiceImpl } from '../../util/service/release-util.service.impl';
import { ReleaseFormComponent } from './release-form.component';

describe('ReleaseFormComponent', () => {
	let component: ReleaseFormComponent;
	let fixture: ComponentFixture<ReleaseFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ReleaseFormComponent],
			providers: [
				provideRouter([]),
				{
					provide: ReleaseStateService,
					useValue: { selectEntityById$: jest.fn(() => of(undefined)) },
				},
				{ provide: ReleaseUtilService, useClass: ReleaseUtilServiceImpl },
				{
					provide: AlbumStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
				{
					provide: ArtistStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
				{
					provide: LabelStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ReleaseFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
