import { Injectable, inject } from '@angular/core';
import { DocumentStateService, EntityTypeEnum } from '@music-collection/api';

import { CollectionImageRepository } from './collection-image.repository';

/** An uploaded picture: where it is, and how it can be shown. */
export interface StoredImage {
	/** The object's path in the bucket, under `document/`. */
	path: string;
	/** The download URL, straight into `<img src>`. */
	url: string;
}

/** What the Storage rule lets a client put in the `document` folder. */
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = /^image\//;

/**
 * Storing a picture an admin made by hand for a collection. It is uploaded
 * as it was chosen — a cover or a pin is small, and scaling it would flatten
 * the transparency the generated badges are drawn with.
 */
@Injectable({ providedIn: 'root' })
export class CollectionImageEffect {
	private readonly repository = inject(CollectionImageRepository);
	private readonly documentStateService = inject(DocumentStateService);

	/**
	 * Uploads the chosen file and answers with its URL and where it landed.
	 * `name` is what the picture is for — `great-british-wave-cover`, say —
	 * and it goes into the file name together with the moment, so a second
	 * upload never lands on the file it replaces: a definition pointing at
	 * the old one goes on loading.
	 *
	 * The path comes back beside the URL because a picture meant to be a pin
	 * does not stop here: the server is asked to file a document over it,
	 * and it reads the object back by its path rather than trusting an
	 * address the client made up.
	 */
	public async store(name: string, file: File): Promise<StoredImage> {
		if (!ACCEPTED.test(file.type)) {
			throw new Error('That file is not an image.');
		}

		if (file.size > MAX_BYTES) {
			throw new Error('The image must be under 5 MB.');
		}

		const extension = file.name.split('.').pop() ?? 'png';
		const path = this.repository.path(
			`${name || 'collection'}-${Date.now()}.${extension}`
		);

		return { path, url: await this.repository.upload(path, file) };
	}

	/**
	 * Ugyanaz, dokumentummal: a kép a könyvtárba is bekerül.
	 *
	 * Nem a fájl kedvéért — az a feltöltéssel megvan —, hanem hogy legyen
	 * hol megtalálni. A könyvtár a dokumentumokból áll, és abból választhat
	 * a következő collection ahelyett, hogy ugyanazt a képet újra
	 * feltöltenék; ami csak a bucketben hever, azt senki nem leli meg többé.
	 *
	 * A pin útja ezért marad a `store`-nál: azt a szerver iktatja be, és
	 * egy fájl fölé nem kell két dokumentum.
	 */
	public async storeAsDocument(
		name: string,
		file: File
	): Promise<StoredImage> {
		const stored = await this.store(name, file);

		// Kategóriát nem kap: ezt kézzel töltötte fel egy admin, és a
		// dokumentum-adminban is a kézi feltöltések közt a helye.
		this.documentStateService.dispatchAddEntityAction({
			entityType: EntityTypeEnum.Document,
			name: name || file.name,
			originalName: file.name,
			fileType: file.type,
			filePath: stored.url,
		});

		return stored;
	}
}
