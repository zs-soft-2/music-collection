import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentListComponent } from './document-list.component';

describe('DocumentListComponent', () => {
	let component: DocumentListComponent;
	let fixture: ComponentFixture<DocumentListComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [DocumentListComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(DocumentListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
