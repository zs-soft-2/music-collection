import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CollectionItemCollectionModule } from '../../../collection/collection-item-collection.module';
import { CollectionItemListPageComponent } from './collection-item-list-page.component';

describe('CollectionItemListComponent', () => {
	let component: CollectionItemListPageComponent;
	let fixture: ComponentFixture<CollectionItemListPageComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [CollectionItemListPageComponent],
			imports: [CollectionItemCollectionModule],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CollectionItemListPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
