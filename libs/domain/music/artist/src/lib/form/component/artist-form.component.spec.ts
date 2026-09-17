import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	ArtistStateService,
	ArtistUtilService,
	DocumentStateService,
} from '@music-collection/api';

import { ArtistUtilServiceImpl } from '../../util/service/artist-util.service.impl';
import { ArtistFormComponent } from './artist-form.component';

describe('ArtistFormComponent', () => {
	let component: ArtistFormComponent;
	let fixture: ComponentFixture<ArtistFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ArtistFormComponent],
			providers: [
				provideRouter([]),
				{
					provide: ArtistStateService,
					useValue: { selectEntityById$: jest.fn(() => of(undefined)) },
				},
				{ provide: ArtistUtilService, useClass: ArtistUtilServiceImpl },
				{
					provide: DocumentStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
