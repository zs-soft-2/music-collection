import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';
import { AlbumFormModule } from '@music-collection/domain/album';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-edit',
	templateUrl: './album-edit.component.html',
	styleUrls: ['./album-edit.component.scss'],
	imports: [
		...I18N_IMPORTS,
		AlbumFormModule,
		Tab,
		TabList,
		TabPanel,
		TabPanels,
		Tabs,
	],
})
export class AlbumEditComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);

	public albumId!: string;
	/** A new album (`edit/0`) has no tracks to load yet. */
	public isExisting = false;

	public ngOnInit(): void {
		this.albumId = this.activatedRoute.snapshot.params['albumId'];
		this.isExisting = !!this.albumId && this.albumId !== '0';
	}
}
