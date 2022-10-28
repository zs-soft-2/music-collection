import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { DocumentCollectionModule } from '../../../collection/document-collection.module';
import { DocumentAdminComponent } from './document-admin.component';

describe('DocumentAdminComponent', () => {
	let component: DocumentAdminComponent;
	let fixture: ComponentFixture<DocumentAdminComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [DocumentAdminComponent],
			imports: [
				HttpClientTestingModule,
				RouterTestingModule,
				DocumentCollectionModule,
			],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(DocumentAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
