import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbumItemViewComponent } from './album-item-view.component';

describe('AlbumItemViewComponent', () => {
	let component: AlbumItemViewComponent;
	let fixture: ComponentFixture<AlbumItemViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [AlbumItemViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumItemViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
