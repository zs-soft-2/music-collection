import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionItemSimpleViewComponent } from './collection-item-simple-view.component';

describe('CollectionItemSimpleViewComponent', () => {
	let component: CollectionItemSimpleViewComponent;
	let fixture: ComponentFixture<CollectionItemSimpleViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [CollectionItemSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(CollectionItemSimpleViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
