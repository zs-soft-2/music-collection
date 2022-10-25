import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AlbumFormModule } from '../../../form/album-form.module';
import { AlbumEditComponent } from './album-edit.component';

describe('AlbumEditComponent', () => {
	let component: AlbumEditComponent;
	let fixture: ComponentFixture<AlbumEditComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [AlbumEditComponent],
			imports: [AlbumFormModule],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(AlbumEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
