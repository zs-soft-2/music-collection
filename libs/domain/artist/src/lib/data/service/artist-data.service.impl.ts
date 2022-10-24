import { nanoid } from 'nanoid';
import { Observable, of } from 'rxjs';

import { Injectable } from '@angular/core';
import {
  ArtistDataService,
  ArtistEntity,
  ArtistEntityAdd,
  ArtistEntityUpdate,
  GenreEnum,
  StyleEnum,
} from '@music-collection/api';

@Injectable()
export class ArtistDataServiceImpl extends ArtistDataService {
  protected artistCollection: ArtistEntity[];

  public constructor() {
    super();

    this.artistCollection = [
      {
        uid: '1',
        genre: GenreEnum.Rock,
        name: 'Decapitated',
        description: 'Death Metal Band',
        formedIn: new Date(),
        sites: [],
        styles: [StyleEnum.Death_Metal, StyleEnum.Teachnical_Death_Metal],
      },
      {
        uid: '2',
        genre: GenreEnum.Rock,
        name: 'Darkness',
        description: 'Thrash Metal Band',
        formedIn: new Date(),
        sites: [],
        styles: [StyleEnum.Thrash_Metal],
      },
    ];
  }

  public add$(artist: ArtistEntityAdd): Observable<ArtistEntity> {
    const newArtist: ArtistEntity = {
      ...artist,
      uid: nanoid(),
    };

    this.artistCollection.push(newArtist);

    return of(newArtist);
  }

  public delete$(artist: ArtistEntity): Observable<ArtistEntity> {
    return of(artist);
  }

  public list$(): Observable<ArtistEntity[]> {
    return of(this.artistCollection);
  }

  public listByIds$(ids: string[]): Observable<ArtistEntity[]> {
    const listByIds: ArtistEntity[] = [];

    return of(
      this.artistCollection.reduce(
        (list: ArtistEntity[], artist: ArtistEntity) => {
          if (ids.includes(artist.uid)) {
            list.push(artist);
          }

          return list;
        },
        listByIds
      )
    );
  }

  public load$(uid: string): Observable<ArtistEntity | undefined> {
    return of(this.artistCollection.find((artist) => artist.uid === uid));
  }

  public update$(artist: ArtistEntityUpdate): Observable<ArtistEntityUpdate> {
    const index = this.artistCollection.findIndex(
      (oldArtist) => oldArtist.uid === artist.uid
    );

    if (index) {
      this.artistCollection[index] = {
        ...this.artistCollection[index],
        ...artist,
      };
    }

    return of(artist);
  }
}
