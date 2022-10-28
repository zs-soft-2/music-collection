import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DocumentCollectionModule } from '../../../collection/document-collection.module';
import { DocumentListPageComponent } from './document-list-page.component';

describe('DocumentListComponent', () => {
	let component: DocumentListPageComponent;
	let fixture: ComponentFixture<DocumentListPageComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [DocumentListPageComponent],
			imports: [DocumentCollectionModule],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(DocumentListPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
