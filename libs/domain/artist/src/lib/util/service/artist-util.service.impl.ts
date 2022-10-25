import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ArtistEntity,
  ArtistEntityAdd,
  ArtistEntityUpdate,
  ArtistUtilService,
  EntityQuantityEntity,
  EntityQuantityEntityUpdate,
  GenreEnum,
} from '@music-collection/api';

@Injectable()
export class ArtistUtilServiceImpl extends ArtistUtilService {
  public _sort = (a: ArtistEntity, b: ArtistEntity): number =>
    a.name < b.name ? 1 : -1;

  public constructor(private formBuilder: FormBuilder) {
    super();
  }

  public createEntity(formGroup: FormGroup): ArtistEntityAdd {
    return {
      name: formGroup.value['name'],
      styles: formGroup.value['styles'],
      description: formGroup.value['description'],
      formedIn: formGroup.value['formedIn'],
      genre: GenreEnum.Rock,
      sites: [],
    };
  }

  public updateEntity(formGroup: FormGroup): ArtistEntityUpdate {
    return {
      uid: formGroup.value['uid'],
      name: formGroup.value['name'],
      styles: formGroup.value['styles'],
      description: formGroup.value['description'],
      formedIn: formGroup.value['formedIn'],
      genre: GenreEnum.Rock,
      sites: [],
    };
  }

  public createFormGroup(artist: ArtistEntity | undefined): FormGroup {
    return this.formBuilder.group({
      description: [artist?.description || null],
      uid: [artist?.uid],
      name: [artist?.name || null, [Validators.required]],
      formedIn: [artist?.formedIn || null, [Validators.required]],
      styles: [artist?.styles || null, [Validators.required]],
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
