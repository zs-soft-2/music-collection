import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionItemFormComponent } from './collection-item-form.component';

describe('CollectionItemFormComponent', () => {
	let component: CollectionItemFormComponent;
	let fixture: ComponentFixture<CollectionItemFormComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			imports: [CollectionItemFormComponent],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CollectionItemFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
