import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlbumStateService } from '@music-collection/api';
import { NgxPermissionsModule } from 'ngx-permissions';

import { AlbumAdminComponent } from './album-admin.component';

describe('AlbumAdminComponent', () => {
	let component: AlbumAdminComponent;
	let fixture: ComponentFixture<AlbumAdminComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [NgxPermissionsModule.forRoot(), AlbumAdminComponent],
			providers: [
				provideRouter([]),
				{
					provide: AlbumStateService,
					useValue: {
						selectNewEntityButtonEnabled$: jest.fn(() => of(true)),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
