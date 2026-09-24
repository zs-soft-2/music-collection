import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelSimpleViewComponent } from './label-simple-view.component';

describe('LabelSimpleViewComponent', () => {
	let component: LabelSimpleViewComponent;
	let fixture: ComponentFixture<LabelSimpleViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [LabelSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(LabelSimpleViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
