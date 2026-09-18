import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnInit,
	Output,
	inject,
} from '@angular/core';
import { AlbumEntity, BaseComponent } from '@music-collection/api';

import { ArtistDetailViewService } from './artist-detail-view.service';
import { ArtistDetailViewStore } from './artist-detail-view.store';
import { Bind } from 'primeng/bind';
import { Image } from 'primeng/image';
import { Tabs, TabList, Tab } from 'primeng/tabs';
import { Ripple } from 'primeng/ripple';
import { Chip } from 'primeng/chip';
import { DataView } from 'primeng/dataview';
import { AlbumItemViewModule } from '@music-collection/domain/album';
import { DatePipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistDetailViewService, ArtistDetailViewStore],
	selector: 'mc-artist-detail-view',
	templateUrl: './artist-detail-view.component.html',
	styleUrls: ['./artist-detail-view.component.scss'],
	imports: [
		Bind,
		Image,
		Tabs,
		TabList,
		Ripple,
		Tab,
		Chip,
		DataView,
		AlbumItemViewModule,
		DatePipe,
	],
})
export class ArtistDetailViewComponent extends BaseComponent implements OnInit {
	private componentService = inject(ArtistDetailViewService);

	public store = inject(ArtistDetailViewStore);

	@Output()
	public selectAlbumDetail: EventEmitter<AlbumEntity>;

	public constructor() {
		super();

		this.selectAlbumDetail = new EventEmitter();
	}

	public ngOnInit(): void {
		this.componentService.init(this.selectAlbumDetail);
	}

	// A PrimeNG Tabs a fül értékét (itt a label-t) adja vissza, a store viszont a
	// teljes MenuItem-et várja — ahogy a korábbi p-tabMenu activeItemChange-e is.
	public selectMenuItem(value: unknown): void {
		const menuItem = this.store
			.menuItems()
			.find((item) => item.label === value);

		if (menuItem) {
			this.store.activeItemChange(menuItem);
		}
	}
}
