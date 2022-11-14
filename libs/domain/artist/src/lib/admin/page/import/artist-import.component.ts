import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent, ExportImportService } from '@music-collection/api';
import { first } from 'rxjs';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-import',
	templateUrl: './artist-import.component.html',
	styleUrls: ['./artist-import.component.scss'],
})
export class ArtistImportComponent extends BaseComponent {
	public constructor(private exportImportService: ExportImportService) {
		super();
	}

	public artistImport(event: any): void {
		this.exportImportService
			.importArtistBundle(event.files[0])
			.pipe(first())
			.subscribe(console.log);
	}
}
