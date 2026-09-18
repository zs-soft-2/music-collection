import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlbumStateService } from '@music-collection/api';

import { AlbumListComponent } from './album-list.component';

describe('AlbumListComponent', () => {
	let component: AlbumListComponent;
	let fixture: ComponentFixture<AlbumListComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AlbumListComponent],
			providers: [
				{
					provide: AlbumStateService,
					useValue: { selectEntities$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
