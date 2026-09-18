import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlbumStateService } from '@music-collection/api';

import { AlbumDetailViewComponent } from './album-detail-view.component';

describe('AlbumDetailViewComponent', () => {
	let component: AlbumDetailViewComponent;
	let fixture: ComponentFixture<AlbumDetailViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AlbumDetailViewComponent],
			providers: [
				provideRouter([]),
				{
					provide: AlbumStateService,
					useValue: { selectEntityById$: jest.fn(() => of(undefined)) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumDetailViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
