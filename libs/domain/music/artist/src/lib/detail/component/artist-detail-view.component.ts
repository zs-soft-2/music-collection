import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnInit,
	Output,
	inject,
} from '@angular/core';
import {
	AlbumEntity,
	BaseComponent,
} from '@music-collection/api';

import { ArtistDetailViewService } from './artist-detail-view.service';
import { ArtistDetailViewStore } from './artist-detail-view.store';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistDetailViewService, ArtistDetailViewStore],
	selector: 'mc-artist-detail-view',
	templateUrl: './artist-detail-view.component.html',
	styleUrls: ['./artist-detail-view.component.scss'],
  standalone: false,
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
