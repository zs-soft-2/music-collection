import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionItemDetailViewComponent } from './collection-item-detail-view.component';

describe('CollectionItemDetailViewComponent', () => {
	let component: CollectionItemDetailViewComponent;
	let fixture: ComponentFixture<CollectionItemDetailViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CollectionItemDetailViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(CollectionItemDetailViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
