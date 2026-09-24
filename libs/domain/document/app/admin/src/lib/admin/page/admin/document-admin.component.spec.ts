import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { NgxPermissionsModule } from 'ngx-permissions';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DocumentStateService } from '@music-collection/api';

import { DocumentAdminComponent } from './document-admin.component';

describe('DocumentAdminComponent', () => {
	let component: DocumentAdminComponent;
	let fixture: ComponentFixture<DocumentAdminComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DocumentAdminComponent, NgxPermissionsModule.forRoot()],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: DocumentStateService,
					useValue: {
						selectNewEntityButtonEnabled$: jest.fn(() => of(true)),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DocumentAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
