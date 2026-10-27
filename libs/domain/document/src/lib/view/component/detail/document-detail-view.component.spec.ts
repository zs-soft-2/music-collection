import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentDetailViewComponent } from './document-detail-view.component';

describe('DocumentDetailViewComponent', () => {
	let component: DocumentDetailViewComponent;
	let fixture: ComponentFixture<DocumentDetailViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [DocumentDetailViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(DocumentDetailViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
