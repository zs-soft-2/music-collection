import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentDetailViewComponent } from './document-detail-view.component';

describe('DocumentDetailViewComponent', () => {
	let component: DocumentDetailViewComponent;
	let fixture: ComponentFixture<DocumentDetailViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [DocumentDetailViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(DocumentDetailViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
