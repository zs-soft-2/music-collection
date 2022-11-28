import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionItemTableComponent } from './collection-item-table.component';

describe('CollectionItemTableComponent', () => {
	let component: CollectionItemTableComponent;
	let fixture: ComponentFixture<CollectionItemTableComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CollectionItemTableComponent],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CollectionItemTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
