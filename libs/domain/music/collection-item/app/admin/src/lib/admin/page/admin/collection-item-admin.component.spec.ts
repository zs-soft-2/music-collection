import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CollectionItemStateService } from '@music-collection/api';
import { NgxPermissionsModule } from 'ngx-permissions';

import { CollectionItemAdminComponent } from './collection-item-admin.component';

describe('CollectionItemAdminComponent', () => {
	let component: CollectionItemAdminComponent;
	let fixture: ComponentFixture<CollectionItemAdminComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				NgxPermissionsModule.forRoot(),
				CollectionItemAdminComponent,
			],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: CollectionItemStateService,
					useValue: {
						selectNewEntityButtonEnabled$: jest.fn(() => of(true)),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(CollectionItemAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
