import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentListComponent } from './document-list.component';

describe('DocumentListComponent', () => {
	let component: DocumentListComponent;
	let fixture: ComponentFixture<DocumentListComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			imports: [DocumentListComponent],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(DocumentListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
