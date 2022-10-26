import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ReleaseCollectionModule } from '../../../collection/release-collection.module';
import { ReleaseListPageComponent } from './release-list-page.component';

describe('ReleaseListComponent', () => {
	let component: ReleaseListPageComponent;
	let fixture: ComponentFixture<ReleaseListPageComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [ReleaseListPageComponent],
			imports: [ReleaseCollectionModule],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ReleaseListPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
