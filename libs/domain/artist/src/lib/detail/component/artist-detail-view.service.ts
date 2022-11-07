import { MenuItem } from 'primeng/api';
import { Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	ArtistDetailParams,
	ArtistStateService,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class ArtistDetailViewService extends BaseComponent {
	private params!: ArtistDetailParams;
	private params$$: ReplaySubject<ArtistDetailParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private artistStateService: ArtistStateService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public init$(): Observable<ArtistDetailParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				this.artistStateService.selectEntityById$(data['artistId'])
			),
			switchMap((artist) => {
				const menuItems: MenuItem[] = [
					{
						label: 'Info',
						icon: '',
						command: () => this.selectContent('info'),
					},
					{
						label: 'Discography',
						icon: '',
						command: () => this.selectContent('discography'),
					},
					{
						label: 'Members',
						icon: '',
						command: () => this.selectContent('members'),
					},
				];

				this.params = {
					artist,
					menuItems,
					activeMenuItem: menuItems[0],
					selectedContent: 'info',
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchHandler(query: string): void {
		this.artistStateService.dispatchSearch(query);
	}

	private selectContent(content: string): void {
		this.params.selectedContent = content;

		this.params$$.next(this.params);
	}
}
