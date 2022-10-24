import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ArtistEntity,
  ArtistUtilService,
  EntityQuantityEntity,
  EntityQuantityEntityUpdate,
} from '@music-collection/api';

@Injectable()
export class ArtistUtilServiceImpl extends ArtistUtilService {
  public _sort = (a: ArtistEntity, b: ArtistEntity): number =>
    a.name < b.name ? 1 : -1;

  public constructor(private formBuilder: FormBuilder) {
    super();
  }

  public createFormGroup(artist: ArtistEntity | undefined): FormGroup {
    return this.formBuilder.group({
      uid: [artist?.uid],
      name: [artist?.name || null, [Validators.required]],
      formedIn: [artist?.formedIn || null, [Validators.required]],
    });
  }

  public updateEntityQuantity(
    entityQuantity: EntityQuantityEntity
  ): EntityQuantityEntityUpdate {
    return {
      ...entityQuantity,
      quantity: entityQuantity.quantity + 1,
    };
  }
}
