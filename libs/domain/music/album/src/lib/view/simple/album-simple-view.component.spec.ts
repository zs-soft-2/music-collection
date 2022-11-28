import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbumSimpleViewComponent } from './album-simple-view.component';

describe('AlbumSimpleViewComponent', () => {
	let component: AlbumSimpleViewComponent;
	let fixture: ComponentFixture<AlbumSimpleViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [AlbumSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumSimpleViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
