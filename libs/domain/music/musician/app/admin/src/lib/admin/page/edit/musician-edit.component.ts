import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';
import { MusicianBandsComponent } from '@music-collection/domain/membership';
import { MusicianFormModule } from '@music-collection/domain/musician';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-musician-edit',
	templateUrl: './musician-edit.component.html',
	styleUrls: ['./musician-edit.component.scss'],
	imports: [
		...I18N_IMPORTS,
		MusicianBandsComponent,
		MusicianFormModule,
		Tab,
		TabList,
		TabPanel,
		TabPanels,
		Tabs,
	],
})
export class MusicianEditComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);

	public musicianId!: string;
	/** A new musician (`edit/0`) has no bands yet. */
	public isExisting = false;

	public ngOnInit(): void {
		this.musicianId = this.activatedRoute.snapshot.params['musicianId'];
		this.isExisting = !!this.musicianId && this.musicianId !== '0';
	}
}
