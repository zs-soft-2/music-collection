import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReleaseDetailViewComponent } from './release-detail-view.component';

describe('ReleaseDetailViewComponent', () => {
	let component: ReleaseDetailViewComponent;
	let fixture: ComponentFixture<ReleaseDetailViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ReleaseDetailViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(ReleaseDetailViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
