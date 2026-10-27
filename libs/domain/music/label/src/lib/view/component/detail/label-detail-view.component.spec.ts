import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelDetailViewComponent } from './label-detail-view.component';

describe('LabelDetailViewComponent', () => {
	let component: LabelDetailViewComponent;
	let fixture: ComponentFixture<LabelDetailViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [LabelDetailViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(LabelDetailViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
