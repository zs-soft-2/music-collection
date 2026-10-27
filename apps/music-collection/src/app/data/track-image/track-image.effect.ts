import { Injectable, inject } from '@angular/core';
import {
	DocumentCategoryEnum,
	type TrackImage,
} from '@music-collection/api';

import { scaleImage } from '../../shared/image';
import { DocumentFileEffect } from '../document-file';
import { TrackDetailsRepository } from '../track-details';

/**
 * Long edge of a stored track picture. Smaller than a copy photo's: this one
 * is a backdrop and a thumbnail, never something to read a matrix number
 * off, and it is also what the player loads while the music is already
 * playing — a backdrop that stalls the first song is no backdrop.
 */
const MAX_EDGE = 1600;
/**
 * WebP at this quality is roughly half the bytes of the JPEG that looks the
 * same, which is the whole point of storing it as WebP.
 */
const QUALITY = 0.8;

/** How many pictures one track can carry. */
export const MAX_TRACK_IMAGES = 12;

/** What a browser hands back from a file picker that we will try to read. */
const ACCEPTED = /^image\//;

/** A file name a bucket and a document list can both live with. */
function slug(name: string): string {
	return (
		name
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 48) || 'track'
	);
}

/**
 * The pictures of a track: scaled and turned into WebP in the browser, then
 * filed the way every other picture of the catalog is — a file in the
 * `document/` folder with a document over it, so it shows up in the document
 * library and can be found again.
 *
 * Every change writes the whole list, because order is what the list means:
 * the header runs through it and the player plays it through in that order.
 */
@Injectable({ providedIn: 'root' })
export class TrackImageEffect {
	private readonly files = inject(DocumentFileEffect);
	private readonly tracks = inject(TrackDetailsRepository);

	/**
	 * Scales the chosen file, files it and writes the longer list. Resolves
	 * the list as it now stands.
	 */
	public async add(
		trackUid: string,
		trackName: string,
		images: TrackImage[],
		file: File
	): Promise<TrackImage[]> {
		if (!ACCEPTED.test(file.type) && file.type !== '') {
			throw new Error('Ez a fájl nem kép.');
		}
		if (images.length >= MAX_TRACK_IMAGES) {
			throw new Error(
				`Egy számhoz legfeljebb ${MAX_TRACK_IMAGES} kép tartozhat.`
			);
		}

		const { blob, width, height, type } = await scaleImage(file, {
			maxEdge: MAX_EDGE,
			quality: QUALITY,
			type: 'image/webp',
		});
		const document = await this.files.store(
			`${slug(trackName)}-${images.length + 1}`,
			blob,
			{
				category: DocumentCategoryEnum.TrackImage,
				originalName: file.name,
				extension: type === 'image/webp' ? 'webp' : undefined,
			}
		);

		return this.write(trackUid, [
			...images,
			{
				entityType: document.entityType,
				uid: document.uid,
				name: document.name,
				filePath: document.filePath,
				category: document.category,
				width,
				height,
			},
		]);
	}

	/**
	 * Takes one picture off the song.
	 *
	 * The file and its document stay where they are. A document is the
	 * catalog's memory of a file, and other things may already point at it —
	 * withdrawing one is the document admin's business, not a side effect of
	 * tidying a track.
	 */
	public remove(
		trackUid: string,
		images: TrackImage[],
		index: number
	): Promise<TrackImage[]> {
		return images[index]
			? this.write(
					trackUid,
					images.filter((_, at) => at !== index)
				)
			: Promise.resolve(images);
	}

	/** Moves one picture one place earlier (-1) or later (+1). */
	public move(
		trackUid: string,
		images: TrackImage[],
		index: number,
		direction: -1 | 1
	): Promise<TrackImage[]> {
		const next = reorder(images, index, index + direction);

		return next === images
			? Promise.resolve(images)
			: this.write(trackUid, next);
	}

	/** Adds a picture a model drew, which the server has already filed. */
	public append(
		trackUid: string,
		images: TrackImage[],
		drawn: TrackImage
	): Promise<TrackImage[]> {
		return this.write(trackUid, [...images, drawn]);
	}

	private async write(
		trackUid: string,
		images: TrackImage[]
	): Promise<TrackImage[]> {
		await this.tracks.updateImages(trackUid, images);

		return images;
	}
}

/**
 * The list with one picture moved, or the same list when there is nowhere to
 * move it to. Pure, so the order can be tested without a browser.
 */
export function reorder<T>(items: T[], from: number, to: number): T[] {
	if (
		from === to ||
		from < 0 ||
		to < 0 ||
		from >= items.length ||
		to >= items.length
	) {
		return items;
	}

	const next = [...items];

	next.splice(to, 0, ...next.splice(from, 1));

	return next;
}
