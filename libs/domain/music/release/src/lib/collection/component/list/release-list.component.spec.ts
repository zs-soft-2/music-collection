import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReleaseStateService } from '@music-collection/api';

import { ReleaseListComponent } from './release-list.component';

describe('ReleaseListComponent', () => {
	let component: ReleaseListComponent;
	let fixture: ComponentFixture<ReleaseListComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ReleaseListComponent],
			providers: [
				provideI18nTesting(),
				{
					provide: ReleaseStateService,
					useValue: { selectEntities$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ReleaseListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
