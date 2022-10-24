import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { ArtistStateService } from '@music-collection/api';

@Injectable()
export class ArtistEditResolverService implements Resolve<void> {
  public constructor(private artistStateService: ArtistStateService) {}

  public resolve(): void | Observable<void> | Promise<void> {
    this.artistStateService.dispatchChangeNewEntityButtonEnabled(false);
  }
}
