import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArtistDetailViewComponent } from './artist-detail-view.component';

describe('ArtistDetailViewComponent', () => {
	let component: ArtistDetailViewComponent;
	let fixture: ComponentFixture<ArtistDetailViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ArtistDetailViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistDetailViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
