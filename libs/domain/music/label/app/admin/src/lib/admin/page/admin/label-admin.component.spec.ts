import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LabelStateService } from '@music-collection/api';
import { NgxPermissionsModule } from 'ngx-permissions';

import { LabelAdminComponent } from './label-admin.component';

describe('LabelAdminComponent', () => {
	let component: LabelAdminComponent;
	let fixture: ComponentFixture<LabelAdminComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [NgxPermissionsModule.forRoot(), LabelAdminComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: LabelStateService,
					useValue: {
						selectNewEntityButtonEnabled$: jest.fn(() => of(true)),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(LabelAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
