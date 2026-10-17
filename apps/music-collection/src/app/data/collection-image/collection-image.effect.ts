import { firstValueFrom } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	DocumentCategoryEnum,
	DocumentDataService,
	DocumentUtilService,
	EntityTypeEnum,
} from '@music-collection/api';

import { scaleImage } from '../../shared/image';
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
 * A rajzolt kép hosszabb oldala: a legnagyobb, amit kirajzolunk, a teljes
 * képernyős jelenet-háttér. A functions `document-file.ts` ugyanígy vágja.
 */
const DRAWN_MAX_EDGE = 2048;
const DRAWN_QUALITY = 0.82;

/**
 * Storing a picture an admin made by hand for a collection. It is uploaded
 * as it was chosen — a cover or a pin is small, and scaling it would flatten
 * the transparency the generated badges are drawn with.
 */
@Injectable({ providedIn: 'root' })
export class CollectionImageEffect {
	private readonly repository = inject(CollectionImageRepository);
	private readonly documents = inject(DocumentDataService);
	private readonly documentUtil = inject(DocumentUtilService);

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
	/**
	 * Egy modell rajzolta kép, WebP-ként eltéve.
	 *
	 * A képmodell PNG-t ad, átlagosan 1,6 MB-ot, és a főlapon több is látszik
	 * belőle egyszerre. A WebP az átlátszóságot is megtartja, ezért itt nem
	 * jár azzal a veszteséggel, ami miatt a kézi feltöltés érintetlen marad.
	 * Ahol a böngésző nem tud WebP-t kódolni, ott PNG jön vissza — a fájl
	 * neve és típusa azt követi, ami ténylegesen elkészült.
	 */
	public async storeDrawnAsDocument(
		name: string,
		drawn: Blob,
		category?: DocumentCategoryEnum
	): Promise<StoredImage> {
		const { blob, type } = await scaleImage(drawn, {
			maxEdge: DRAWN_MAX_EDGE,
			quality: DRAWN_QUALITY,
			type: 'image/webp',
		});
		const kept = blob.size < drawn.size ? blob : drawn;
		const keptType = kept === blob ? type : drawn.type || 'image/png';
		const extension = keptType.split('/').pop() ?? 'png';

		return this.storeAsDocument(
			name,
			new File([kept], `${name}.${extension}`, { type: keptType }),
			category
		);
	}

	public async storeAsDocument(
		name: string,
		file: File,
		category?: DocumentCategoryEnum
	): Promise<StoredImage> {
		const stored = await this.store(name, file);

		/*
		 * Megvárjuk az írást, és nem a state service-en dispatcheljük.
		 *
		 * A dispatch tűzd-és-felejtsd: ha a Firestore-írás elbukik — hiányzó
		 * jogosultság, elutasító szabály —, a hívó akkor is késznek látja,
		 * kiírja a felületre, és a kép ott marad a bucketben dokumentum
		 * nélkül, vagyis láthatatlanul. Pont az a baj, ami ellen a
		 * dokumentum készül.
		 *
		 * Kategóriát a hívó mond, ha tudja, mire készült a kép — a
		 * jelenetpadon rajzolt háttér háttér, bárki kérte is. Aki nem mond
		 * semmit, annak a dokumentuma kategória nélkül áll, és a
		 * dokumentum-adminban a be nem sorolt feltöltések közt a helye;
		 * `undefined` mezőt a Firestore nem vesz át, ezért marad ki.
		 */
		await firstValueFrom(
			this.documents.add$(
				this.documentUtil.convertEntityAddToModelAdd({
					entityType: EntityTypeEnum.Document,
					name: name || file.name,
					originalName: file.name,
					fileType: file.type,
					filePath: stored.url,
					...(category ? { category } : {}),
				})
			)
		);

		/*
		 * A darabszámlálót itt NEM léptetjük, és ez szándékos.
		 *
		 * Az NgRx út első lépése az `entity-quantity` Document bejegyzésének
		 * megvárása volt (`first()`), és ha az a store-ba még nem töltött be,
		 * a selector nem emittál: az effect csendben vár, az írás soha nem
		 * történik meg, a felület meg kiírja, hogy kész. Ugyanez a csapda
		 * várna itt is, csak az írás után — a hívó ragadna be.
		 *
		 * A számláló admin-statisztika; a képkönyvtár és a dokumentum-lista
		 * a Firestore-ból olvas, nem belőle. Egy el nem mozduló szám
		 * kellemetlen, egy el nem készülő dokumentum működésképtelen.
		 */
		return stored;
	}
}
