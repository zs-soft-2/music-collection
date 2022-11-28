import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReleaseFormComponent } from './release-form.component';

describe('ReleaseFormComponent', () => {
	let component: ReleaseFormComponent;
	let fixture: ComponentFixture<ReleaseFormComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ReleaseFormComponent],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ReleaseFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
