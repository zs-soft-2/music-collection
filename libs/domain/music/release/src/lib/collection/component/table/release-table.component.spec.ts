import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReleaseTableComponent } from './release-table.component';

describe('ReleaseTableComponent', () => {
	let component: ReleaseTableComponent;
	let fixture: ComponentFixture<ReleaseTableComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ReleaseTableComponent],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ReleaseTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
