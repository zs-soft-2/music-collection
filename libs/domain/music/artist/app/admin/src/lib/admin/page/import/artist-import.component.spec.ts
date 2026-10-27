import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportImportService } from '@music-collection/api';

import { ArtistImportComponent } from './artist-import.component';

describe('ArtistImportComponent', () => {
	let component: ArtistImportComponent;
	let fixture: ComponentFixture<ArtistImportComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ArtistImportComponent],
			providers: [
				provideI18nTesting(),
				{ provide: ExportImportService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistImportComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
