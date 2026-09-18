import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportImportService } from '@music-collection/api';

import { ArtistImportComponent } from './artist-import.component';

describe('ArtistImportComponent', () => {
	let component: ArtistImportComponent;
	let fixture: ComponentFixture<ArtistImportComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ArtistImportComponent],
			providers: [{ provide: ExportImportService, useValue: {} }],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistImportComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
