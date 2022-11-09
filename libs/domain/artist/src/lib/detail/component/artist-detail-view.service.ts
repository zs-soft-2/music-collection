import { MenuItem } from 'primeng/api';
import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	AlbumEntity,
	AlbumUtilService,
	ArtistDetailParams,
	ArtistStateService,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class ArtistDetailViewService extends BaseComponent {
	private albums: AlbumEntity[] | undefined;
	private artistId: string | undefined;
	private menuItemNames = ['info', 'discography', 'members'];
	private menuItems: MenuItem[];
	private params!: ArtistDetailParams;
	private params$$: ReplaySubject<ArtistDetailParams>;
	private selectedContent = 'info';

	public constructor(
		private activatedRoute: ActivatedRoute,
		private artistStateService: ArtistStateService,
		private albumUtilService: AlbumUtilService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
		this.menuItems = [
			{
				label: 'Info',
				icon: '',
				command: () => this.selectContent('info'),
			},
			{
				label: 'Discography',
				icon: '',
				command: () => {
					this.artistStateService.dispatchListAlbumsByIdAction(
						this.artistId || ''
					),
						this.selectContent('discography');
				},
			},
			{
				label: 'Members',
				icon: '',
				command: () => this.selectContent('members'),
			},
		];
	}

	public init$(): Observable<ArtistDetailParams> {
		return this.activatedRoute.params.pipe(
			tap((data) => (this.artistId = data['artistId'])),
			switchMap(() =>
				combineLatest([
					this.artistStateService.selectEntityById$(
						this.artistId || ''
					),
					this.artistStateService
						.selectAlbumsById$()
						.pipe(
							map((albums) =>
								albums
									? [...albums].sort(
											this.albumUtilService._sortByYear
									  )
									: albums
							)
						),
				])
			),
			switchMap(([artist, albums]) => {
				this.params = {
					albums,
					artist,
					menuItems: this.menuItems,
					activeMenuItem:
						this.menuItems[
							this.menuItemNames.findIndex(
								(menuItemName) =>
									menuItemName === this.selectedContent
							) || 0
						],
					selectedContent: this.selectedContent,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	private selectContent(content: string): void {
		this.selectedContent = content;
		this.params.selectedContent = content;

		this.params$$.next(this.params);
	}
}
