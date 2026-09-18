import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';
import { ArtistFormModule } from '@music-collection/domain/artist';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-edit',
	templateUrl: './artist-edit.component.html',
	styleUrls: ['./artist-edit.component.scss'],
	imports: [ArtistFormModule, Tab, TabList, TabPanel, TabPanels, Tabs],
})
export class ArtistEditComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);

	public artistId!: string;
	/** A new artist (`edit/0`) has no albums yet. */
	public isExisting = false;

	public ngOnInit(): void {
		this.artistId = this.activatedRoute.snapshot.params['artistId'];
		this.isExisting = !!this.artistId && this.artistId !== '0';
	}
}
