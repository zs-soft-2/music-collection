import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlbumUtilService, ArtistStateService } from '@music-collection/api';

import { ArtistDetailViewComponent } from './artist-detail-view.component';

describe('ArtistDetailViewComponent', () => {
	let component: ArtistDetailViewComponent;
	let fixture: ComponentFixture<ArtistDetailViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ArtistDetailViewComponent],
			providers: [
				provideRouter([]),
				{
					provide: ArtistStateService,
					useValue: {
						selectAlbumsById$: jest.fn(() => of([])),
						selectEntityById$: jest.fn(() => of(undefined)),
					},
				},
				{ provide: AlbumUtilService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistDetailViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
