import { MenuItem } from 'primeng/api';
import { combineLatest, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { EventEmitter, Injectable, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	AlbumEntity,
	AlbumUtilService,
	ArtistDetailViewStateModel,
	ArtistEntity,
	ArtistStateService,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class ArtistDetailViewService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private artistStateService = inject(ArtistStateService);
	private albumUtilService = inject(AlbumUtilService);

	private artistId: string | undefined;
	private selectAlbumDetailEvent!: EventEmitter<AlbumEntity>;
	private selectedContent = 'info';

	public dispatchListAlbumsByIdAction(artistId: string): void {
		this.artistStateService.dispatchListAlbumsByIdAction(artistId);
	}

	public getData(): Observable<[ArtistEntity | undefined, AlbumEntity[]]> {
		return this.activatedRoute.params.pipe(
			tap((data) => (this.artistId = data['artistId'])),
			switchMap(() =>
				combineLatest([
					this.artistStateService.selectEntityById$(
						this.artistId || '',
					),
					this.artistStateService
						.selectAlbumsById$(this.artistId || '')
						.pipe(
							map((albums) =>
								albums
									? [...albums].sort(
											this.albumUtilService._sortByYear,
										)
									: albums,
							),
						),
				]),
			),
		);
	}

	public init(selectAlbumDetailEvent: EventEmitter<AlbumEntity>): void {
		this.selectAlbumDetailEvent = selectAlbumDetailEvent;
	}

	public selectAlbumDetail(album: AlbumEntity): void {
		this.selectAlbumDetailEvent.emit(album);
	}
}
