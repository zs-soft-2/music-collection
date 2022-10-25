import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelDetailViewComponent } from './label-detail-view.component';

describe('LabelDetailViewComponent', () => {
	let component: LabelDetailViewComponent;
	let fixture: ComponentFixture<LabelDetailViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [LabelDetailViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(LabelDetailViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
