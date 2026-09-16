import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import {
	ArtistEntity,
	ArtistListParams,
	BaseComponent,
} from '@music-collection/api';

import { ArtistListService } from './artist-list.service';
import { Bind } from 'primeng/bind';
import { Carousel } from 'primeng/carousel';
import { PrimeTemplate } from 'primeng/api';
import { ArtistSimpleViewComponent } from '../../../view/component/simple/artist-simple-view.component';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistListService],
	selector: 'mc-artist-list',
	templateUrl: './artist-list.component.html',
	styleUrls: ['./artist-list.component.scss'],
	imports: [
		Bind,
		Carousel,
		PrimeTemplate,
		ArtistSimpleViewComponent,
		AsyncPipe,
	],
})
export class ArtistListComponent extends BaseComponent implements OnInit {
	private componentService = inject(ArtistListService);

	public params$!: Observable<ArtistListParams>;

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public selectArtistHandler(artist: ArtistEntity): void {
		this.componentService.selectArtistHandler(artist);
	}
}
