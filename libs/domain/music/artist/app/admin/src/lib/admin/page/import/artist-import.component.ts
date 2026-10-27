import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { first } from 'rxjs';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BaseComponent, ExportImportService } from '@music-collection/api';
import { Bind } from 'primeng/bind';
import { FileUpload } from 'primeng/fileupload';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-import',
	templateUrl: './artist-import.component.html',
	styleUrls: ['./artist-import.component.scss'],
	imports: [...I18N_IMPORTS, Bind, FileUpload],
})
export class ArtistImportComponent extends BaseComponent {
	private exportImportService = inject(ExportImportService);

	public artistImport(event: any): void {
		this.exportImportService
			.importArtistBundle(event.files[0])
			.pipe(first())
			.subscribe(console.log);
	}
}
