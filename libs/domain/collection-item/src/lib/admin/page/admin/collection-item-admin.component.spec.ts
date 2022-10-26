import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { CollectionItemCollectionModule } from '../../../collection/collection-item-collection.module';
import { CollectionItemAdminComponent } from './collection-item-admin.component';

describe('CollectionItemAdminComponent', () => {
	let component: CollectionItemAdminComponent;
	let fixture: ComponentFixture<CollectionItemAdminComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CollectionItemAdminComponent],
			imports: [
				HttpClientTestingModule,
				RouterTestingModule,
				CollectionItemCollectionModule,
			],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CollectionItemAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
