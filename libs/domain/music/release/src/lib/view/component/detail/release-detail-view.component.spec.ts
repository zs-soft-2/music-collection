import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReleaseDetailViewComponent } from './release-detail-view.component';

describe('ReleaseDetailViewComponent', () => {
	let component: ReleaseDetailViewComponent;
	let fixture: ComponentFixture<ReleaseDetailViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [ReleaseDetailViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(ReleaseDetailViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
