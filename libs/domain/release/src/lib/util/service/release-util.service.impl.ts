import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	AlbumEntity,
	ArtistEntity,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	LabelEntity,
	ReleaseAlbum,
	ReleaseArtist,
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
	ReleaseLabel,
	ReleaseUtilService,
} from '@music-collection/api';

@Injectable()
export class ReleaseUtilServiceImpl extends ReleaseUtilService {
	public _sort = (a: ReleaseEntity, b: ReleaseEntity): number =>
		a.name < b.name ? 1 : -1;

	public constructor(private formBuilder: FormBuilder) {
		super();
	}

	public createEntity(formGroup: FormGroup): ReleaseEntityAdd {
		return {
			album: this.createReleaseAlbum(formGroup.value['album']),
			artist: this.createReleaseArtist(formGroup.value['artist']),
			date: formGroup.value['date'],
			format: formGroup.value['format'],
			formatDescription: formGroup.value['formatDescription'],
			label: this.createReleaseLabel(formGroup.value['label']),
			media: formGroup.value['media'],
			name: formGroup.value['name'],
		};
	}

	public createFormGroup(release: ReleaseEntity | undefined): FormGroup {
		return this.formBuilder.group({
			album: [release?.album || null, [Validators.required]],
			artist: [release?.artist || null, [Validators.required]],
			date: [release?.date || null, [Validators.required]],
			format: [release?.format || null, [Validators.required]],
			formatDescription: [release?.formatDescription || null],
			label: [release?.label || null, [Validators.required]],
			media: [release?.media || null, [Validators.required]],
			name: [release?.name || null, [Validators.required]],
			uid: [release?.uid],
		});
	}

	public updateEntity(formGroup: FormGroup): ReleaseEntityUpdate {
		return {
			album: this.createReleaseAlbum(formGroup.value['album']),
			artist: this.createReleaseArtist(formGroup.value['artist']),
			date: formGroup.value['date'],
			name: formGroup.value['name'],
			label: this.createReleaseLabel(formGroup.value['label']),
			format: formGroup.value['format'],
			formatDescription: formGroup.value['formatDescription'],
			media: formGroup.value['media'],
			uid: formGroup.value['uid'],
		};
	}

	public updateEntityQuantity(
		entityQuantity: EntityQuantityEntity
	): EntityQuantityEntityUpdate {
		return {
			...entityQuantity,
			quantity: entityQuantity.quantity + 1,
		};
	}

	private createReleaseAlbum(album: AlbumEntity): ReleaseAlbum {
		const { uid, name, artist, genre, songs, styles } = album;

		return {
			uid,
			name,
			artist,
			genre,
			songs,
			styles,
		};
	}

	private createReleaseArtist(artist: ArtistEntity): ReleaseArtist {
		const { uid, name } = artist;

		return {
			uid,
			name,
		};
	}

	private createReleaseLabel(label: LabelEntity): ReleaseLabel {
		const { uid, name } = label;

		return {
			uid,
			name,
		};
	}
}
