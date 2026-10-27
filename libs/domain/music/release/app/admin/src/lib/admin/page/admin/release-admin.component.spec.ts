import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReleaseStateService } from '@music-collection/api';
import { NgxPermissionsModule } from 'ngx-permissions';

import { ReleaseAdminComponent } from './release-admin.component';

describe('ReleaseAdminComponent', () => {
	let component: ReleaseAdminComponent;
	let fixture: ComponentFixture<ReleaseAdminComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [NgxPermissionsModule.forRoot(), ReleaseAdminComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: ReleaseStateService,
					useValue: {
						selectNewEntityButtonEnabled$: jest.fn(() => of(true)),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ReleaseAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
