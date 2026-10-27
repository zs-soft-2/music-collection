import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentSimpleViewComponent } from './document-simple-view.component';

describe('DocumentSimpleViewComponent', () => {
	let component: DocumentSimpleViewComponent;
	let fixture: ComponentFixture<DocumentSimpleViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [DocumentSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(DocumentSimpleViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
