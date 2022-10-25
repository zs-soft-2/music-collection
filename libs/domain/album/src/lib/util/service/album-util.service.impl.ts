import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  AlbumArtist,
  AlbumEntity,
  AlbumEntityAdd,
  AlbumEntityUpdate,
  AlbumUtilService,
  ArtistEntity,
  EntityQuantityEntity,
  EntityQuantityEntityUpdate,
  GenreEnum,
} from '@music-collection/api';

@Injectable()
export class AlbumUtilServiceImpl extends AlbumUtilService {
  public _sort = (a: AlbumEntity, b: AlbumEntity): number =>
    a.name < b.name ? 1 : -1;

  public constructor(private formBuilder: FormBuilder) {
    super();
  }

  public createEntity(formGroup: FormGroup): AlbumEntityAdd {
    return {
      name: formGroup.value['name'],
      styles: formGroup.value['styles'],
      songs: formGroup.value['songs'],
      artist: this.createSimpleArtist(formGroup.value['artist']),
      genre: GenreEnum.Rock,
      year: formGroup.value['year'],
    };
  }

  public updateEntity(formGroup: FormGroup): AlbumEntityUpdate {
    return {
      uid: formGroup.value['uid'],
      name: formGroup.value['name'],
      styles: formGroup.value['styles'],
      songs: formGroup.value['songs'],
      artist: this.createSimpleArtist(formGroup.value['artist']),
      genre: GenreEnum.Rock,
      year: formGroup.value['year'],
    };
  }

  public createFormGroup(album: AlbumEntity | undefined): FormGroup {
    return this.formBuilder.group({
      songs: [album?.songs || null],
      uid: [album?.uid],
      name: [album?.name || null, [Validators.required]],
      artist: [album?.artist || null, [Validators.required]],
      styles: [album?.styles || null, [Validators.required]],
      year: [album?.year || null, [Validators.required]],
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

  private createSimpleArtist(artist: ArtistEntity): AlbumArtist {
    const { uid, name } = artist;

    return {
      uid,
      name,
    };
  }
}
