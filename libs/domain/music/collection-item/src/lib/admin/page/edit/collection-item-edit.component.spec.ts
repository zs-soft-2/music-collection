import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CollectionItemFormModule } from '../../../form/collection-item-form.module';
import { CollectionItemEditComponent } from './collection-item-edit.component';

describe('CollectionItemEditComponent', () => {
	let component: CollectionItemEditComponent;
	let fixture: ComponentFixture<CollectionItemEditComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [CollectionItemEditComponent],
			imports: [CollectionItemFormModule],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CollectionItemEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
