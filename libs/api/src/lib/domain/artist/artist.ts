import { FormGroup } from '@angular/forms';
import { GenreEnum, Identifiable, StyleEnum } from '../../common';

export interface Artist {
  description: string;
  formedIn: Date;
  members?: any[];
  name: string;
  sites: string[];
  genre: GenreEnum;
  styles: StyleEnum[];
}

export type ArtistEntity = Artist & Identifiable;

export type ArtistEntityAdd = Omit<ArtistEntity, 'uid'>;

export type ArtistEntityUpdate = Partial<ArtistEntity> & Identifiable;

export type ArtistFormParams = {
  formGroup: FormGroup;
  styleList: StyleEnum[];
};

export type ArtistTableParams = {
  artists: ArtistEntity[];
};
