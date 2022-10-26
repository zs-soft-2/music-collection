import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbumDetailViewComponent } from './album-detail-view.component';

describe('AlbumDetailViewComponent', () => {
	let component: AlbumDetailViewComponent;
	let fixture: ComponentFixture<AlbumDetailViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [AlbumDetailViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumDetailViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
