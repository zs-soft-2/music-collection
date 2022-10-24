import { Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArtistEntity,
  ArtistFormParams,
  ArtistStateService,
  ArtistUtilService,
} from '@music-collection/api';

@Injectable()
export class ArtistFormService {
  private params!: ArtistFormParams;
  private params$$: ReplaySubject<ArtistFormParams>;

  public constructor(
    private activatedRoute: ActivatedRoute,
    private artistStateService: ArtistStateService,
    private artistUtilService: ArtistUtilService,
    private router: Router
  ) {
    this.params$$ = new ReplaySubject();
  }

  public cancel(): void {
    this.router.navigate(['../../list'], {
      relativeTo: this.activatedRoute,
    });
  }

  public init$(): Observable<ArtistFormParams> {
    return this.activatedRoute.params.pipe(
      switchMap((data) =>
        this.artistStateService.selectEntityById$(data['artistId'])
      ),
      switchMap((artist) => {
        this.params = this.createArtistParams(artist);

        this.params$$.next(this.params);

        return this.params$$;
      })
    );
  }

  public submit(): void {
    console.log();
  }

  private createArtistParams(
    artist: ArtistEntity | undefined
  ): ArtistFormParams {
    const formGroup = this.artistUtilService.createFormGroup(artist);

    const artistFormParams: ArtistFormParams = {
      formGroup,
    };

    return artistFormParams;
  }
}
