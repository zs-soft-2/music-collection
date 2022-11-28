import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReleaseSimpleViewComponent } from './release-simple-view.component';

describe('ReleaseSimpleViewComponent', () => {
	let component: ReleaseSimpleViewComponent;
	let fixture: ComponentFixture<ReleaseSimpleViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ReleaseSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(ReleaseSimpleViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
