import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DocumentFormModule } from '../../../form/document-form.module';
import { DocumentEditComponent } from './document-edit.component';

describe('DocumentEditComponent', () => {
	let component: DocumentEditComponent;
	let fixture: ComponentFixture<DocumentEditComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [DocumentEditComponent],
			imports: [DocumentFormModule],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(DocumentEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
