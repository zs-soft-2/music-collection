import { Observable, of, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArtistEntity,
  ArtistStateService,
  ArtistTableParams,
  BaseComponent,
} from '@music-collection/api';

@Injectable()
export class ArtistTableService extends BaseComponent {
  private params!: ArtistTableParams;
  private params$$: ReplaySubject<ArtistTableParams>;

  public constructor(
    private activatedRoute: ActivatedRoute,
    private artistStateService: ArtistStateService,
    private router: Router
  ) {
    super();

    this.params$$ = new ReplaySubject();
  }

  public editArtist(artist: ArtistEntity): void {
    this.router.navigate(['../edit', artist?.uid], {
      relativeTo: this.activatedRoute,
    });
  }

  public init$(): Observable<ArtistTableParams> {
    return this.artistStateService.selectEntities$().pipe(
      switchMap((artists) => {
        this.params = {
          artists,
        };

        this.params$$.next(this.params);

        return this.params$$;
      })
    );
  }
}
