import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ArtistFormModule } from '../../../form/artist-form.module';
import { ArtistImportComponent } from './artist-import.component';

describe('ArtistImportComponent', () => {
	let component: ArtistImportComponent;
	let fixture: ComponentFixture<ArtistImportComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [ArtistImportComponent],
			imports: [ArtistFormModule],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ArtistImportComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
