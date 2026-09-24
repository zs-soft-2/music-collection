import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ArtistStateService } from '@music-collection/api';
import { NgxPermissionsModule } from 'ngx-permissions';

import { ArtistAdminComponent } from './artist-admin.component';

describe('ArtistAdminComponent', () => {
	let component: ArtistAdminComponent;
	let fixture: ComponentFixture<ArtistAdminComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [NgxPermissionsModule.forRoot(), ArtistAdminComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: ArtistStateService,
					useValue: {
						selectNewEntityButtonEnabled$: jest.fn(() => of(true)),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
