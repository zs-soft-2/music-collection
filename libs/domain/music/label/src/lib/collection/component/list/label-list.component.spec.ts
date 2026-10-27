import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelListComponent } from './label-list.component';

describe('LabelListComponent', () => {
	let component: LabelListComponent;
	let fixture: ComponentFixture<LabelListComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [LabelListComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(LabelListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
