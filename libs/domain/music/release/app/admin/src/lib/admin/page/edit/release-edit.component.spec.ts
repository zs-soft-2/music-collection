import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ReleaseFormModule } from '../../../form/release-form.module';
import { ReleaseEditComponent } from './release-edit.component';

describe('ReleaseEditComponent', () => {
	let component: ReleaseEditComponent;
	let fixture: ComponentFixture<ReleaseEditComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [ReleaseEditComponent],
			imports: [ReleaseFormModule],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ReleaseEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
