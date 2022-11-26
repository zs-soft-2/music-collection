import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionContentComponent } from './collection-content.component';

describe('CollectionContentComponent', () => {
	let component: CollectionContentComponent;
	let fixture: ComponentFixture<CollectionContentComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [CollectionContentComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(CollectionContentComponent);

		component = fixture.componentInstance;

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
