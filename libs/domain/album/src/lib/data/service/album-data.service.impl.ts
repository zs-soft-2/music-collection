import { nanoid } from 'nanoid';
import { Observable, of } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	AlbumDataService,
	AlbumEntity,
	AlbumEntityAdd,
	AlbumEntityUpdate,
	GenreEnum,
	StyleEnum,
} from '@music-collection/api';

@Injectable()
export class AlbumDataServiceImpl extends AlbumDataService {
	protected albumCollection: AlbumEntity[];

	public constructor() {
		super();

		this.albumCollection = [];
	}

	public add$(album: AlbumEntityAdd): Observable<AlbumEntity> {
		const newAlbum: AlbumEntity = {
			...album,
			uid: nanoid(),
		};

		this.albumCollection = this.albumCollection.concat([newAlbum]);

		return of(newAlbum);
	}

	public delete$(album: AlbumEntity): Observable<AlbumEntity> {
		return of(album);
	}

	public list$(): Observable<AlbumEntity[]> {
		return of(this.albumCollection);
	}

	public listByIds$(ids: string[]): Observable<AlbumEntity[]> {
		const listByIds: AlbumEntity[] = [];

		return of(
			this.albumCollection.reduce(
				(list: AlbumEntity[], album: AlbumEntity) => {
					if (ids.includes(album.uid)) {
						list.push(album);
					}

					return list;
				},
				listByIds
			)
		);
	}

	public load$(uid: string): Observable<AlbumEntity | undefined> {
		return of(this.albumCollection.find((album) => album.uid === uid));
	}

	public update$(album: AlbumEntityUpdate): Observable<AlbumEntityUpdate> {
		this.albumCollection = this.albumCollection.map((oldAlbum) => {
			return (
				oldAlbum.uid === album.uid
					? {
							...oldAlbum,
							...album,
					  }
					: album
			) as AlbumEntity;
		});

		return of(album);
	}
}
