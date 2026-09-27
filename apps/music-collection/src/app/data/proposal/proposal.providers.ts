import { Provider, inject } from '@angular/core';
import {
	ALBUM_FEATURE_KEY,
	ARTIST_FEATURE_KEY,
	AlbumEntity,
	AlbumEntityAdd,
	AlbumEntityUpdate,
	AlbumStateService,
	AlbumUtilService,
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	ArtistStateService,
	ArtistUtilService,
	EntityTypeEnum,
	LABEL_FEATURE_KEY,
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate,
	LabelStateService,
	LabelUtilService,
	MUSICIAN_FEATURE_KEY,
	MusicianEntity,
	MusicianEntityAdd,
	MusicianEntityUpdate,
	MusicianStateService,
	MusicianUtilService,
	RELEASE_FEATURE_KEY,
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
	ReleaseStateService,
	ReleaseUtilService,
} from '@music-collection/api';

import { proposalStateProxy } from './proposal-state.proxy';
import { ProposalService } from './proposal.service';

/**
 * What a page needs to let the catalog's own form propose instead of save:
 * one provider, which swaps the entity's state service for a proxy of it.
 *
 * `skipSelf` is what makes it possible — the proxy is built around the real
 * service from the injector above, so every question the form asks still
 * reaches the catalog.
 *
 * Each entity says two things about where it belongs: what a new one would go
 * under, and where an existing one sits. They are written out rather than
 * derived, because an album living under its artist and a release under its
 * album is the shape of the catalog, not a rule that follows from a name.
 */

/** The uid of an entity referenced by a model field, e.g. an album's artist. */
const referenced = (model: Record<string, unknown>, field: string): string =>
	String((model[field] as { uid?: string } | undefined)?.uid ?? '');

const asRecord = (value: unknown): Record<string, unknown> =>
	value as Record<string, unknown>;

/** A document of the feature under its parent, or in the catalog's root. */
const documentPath = (
	parent: string | null,
	featureKey: string,
	model: Record<string, unknown>,
	needsParent: boolean
): string | null =>
	needsParent && !parent
		? null
		: `${parent ? `${parent}/` : ''}${featureKey}/${String(model['uid'])}`;

export function provideArtistProposal(): Provider {
	return {
		provide: ArtistStateService,
		useFactory: () => {
			const real = inject(ArtistStateService, { skipSelf: true });
			const proposals = inject(ProposalService);
			const util = inject(ArtistUtilService);

			return proposalStateProxy(real, {
				update: (update) =>
					proposals.propose<ArtistEntity>({
						featureKey: ARTIST_FEATURE_KEY,
						entityType: EntityTypeEnum.Artist,
						current$: real.selectEntityById$(update.uid),
						toModel: (entity) =>
							asRecord(util.convertEntityToModel(entity)),
						changed: asRecord(
							util.convertEntityUpdateToModelUpdate(
								update as unknown as ArtistEntityUpdate
							)
						),
						path: (model) =>
							documentPath(
								null,
								ARTIST_FEATURE_KEY,
								model,
								false
							),
					}),
				create: (entity) =>
					proposals.proposeNew({
						featureKey: ARTIST_FEATURE_KEY,
						entityType: EntityTypeEnum.Artist,
						entity: asRecord(
							util.convertEntityAddToModelAdd(
								entity as unknown as ArtistEntityAdd
							)
						),
						parentPath: () => null,
						needsParent: false,
					}),
			});
		},
	};
}

export function provideAlbumProposal(): Provider {
	return {
		provide: AlbumStateService,
		useFactory: () => {
			const real = inject(AlbumStateService, { skipSelf: true });
			const proposals = inject(ProposalService);
			const util = inject(AlbumUtilService);
			const parentPath = (model: Record<string, unknown>) => {
				const artist = referenced(model, 'artist');

				return artist ? `${ARTIST_FEATURE_KEY}/${artist}` : null;
			};

			return proposalStateProxy(real, {
				update: (update) =>
					proposals.propose<AlbumEntity>({
						featureKey: ALBUM_FEATURE_KEY,
						entityType: EntityTypeEnum.Album,
						current$: real.selectEntityById$(update.uid),
						toModel: (entity) =>
							asRecord(util.convertEntityToModel(entity)),
						changed: asRecord(
							util.convertEntityUpdateToModelUpdate(
								update as unknown as AlbumEntityUpdate
							)
						),
						path: (model) =>
							documentPath(
								parentPath(model),
								ALBUM_FEATURE_KEY,
								model,
								true
							),
					}),
				create: (entity) =>
					proposals.proposeNew({
						featureKey: ALBUM_FEATURE_KEY,
						entityType: EntityTypeEnum.Album,
						entity: asRecord(
							util.convertEntityAddToModelAdd(
								entity as unknown as AlbumEntityAdd
							)
						),
						parentPath,
						needsParent: true,
					}),
			});
		},
	};
}

export function provideReleaseProposal(): Provider {
	return {
		provide: ReleaseStateService,
		useFactory: () => {
			const real = inject(ReleaseStateService, { skipSelf: true });
			const proposals = inject(ProposalService);
			const util = inject(ReleaseUtilService);
			const parentPath = (model: Record<string, unknown>) => {
				const artist = referenced(model, 'artist');
				const album = referenced(model, 'album');

				return artist && album
					? `${ARTIST_FEATURE_KEY}/${artist}/${ALBUM_FEATURE_KEY}/${album}`
					: null;
			};

			return proposalStateProxy(real, {
				update: (update) =>
					proposals.propose<ReleaseEntity>({
						featureKey: RELEASE_FEATURE_KEY,
						entityType: EntityTypeEnum.Release,
						current$: real.selectEntityById$(update.uid),
						toModel: (entity) =>
							asRecord(util.convertEntityToModel(entity)),
						changed: asRecord(
							util.convertEntityUpdateToModelUpdate(
								update as unknown as ReleaseEntityUpdate
							)
						),
						path: (model) =>
							documentPath(
								parentPath(model),
								RELEASE_FEATURE_KEY,
								model,
								true
							),
					}),
				create: (entity) =>
					proposals.proposeNew({
						featureKey: RELEASE_FEATURE_KEY,
						entityType: EntityTypeEnum.Release,
						entity: asRecord(
							util.convertEntityAddToModelAdd(
								entity as unknown as ReleaseEntityAdd
							)
						),
						parentPath,
						needsParent: true,
					}),
			});
		},
	};
}

export function provideLabelProposal(): Provider {
	return {
		provide: LabelStateService,
		useFactory: () => {
			const real = inject(LabelStateService, { skipSelf: true });
			const proposals = inject(ProposalService);
			const util = inject(LabelUtilService);

			return proposalStateProxy(real, {
				update: (update) =>
					proposals.propose<LabelEntity>({
						featureKey: LABEL_FEATURE_KEY,
						entityType: EntityTypeEnum.Label,
						current$: real.selectEntityById$(update.uid),
						toModel: (entity) =>
							asRecord(util.convertEntityToModel(entity)),
						changed: asRecord(
							util.convertEntityUpdateToModelUpdate(
								update as unknown as LabelEntityUpdate
							)
						),
						path: (model) =>
							documentPath(null, LABEL_FEATURE_KEY, model, false),
					}),
				create: (entity) =>
					proposals.proposeNew({
						featureKey: LABEL_FEATURE_KEY,
						entityType: EntityTypeEnum.Label,
						entity: asRecord(
							util.convertEntityAddToModelAdd(
								entity as unknown as LabelEntityAdd
							)
						),
						parentPath: () => null,
						needsParent: false,
					}),
			});
		},
	};
}

export function provideMusicianProposal(): Provider {
	return {
		provide: MusicianStateService,
		useFactory: () => {
			const real = inject(MusicianStateService, { skipSelf: true });
			const proposals = inject(ProposalService);
			const util = inject(MusicianUtilService);

			return proposalStateProxy(real, {
				update: (update) =>
					proposals.propose<MusicianEntity>({
						featureKey: MUSICIAN_FEATURE_KEY,
						entityType: EntityTypeEnum.Musician,
						current$: real.selectEntityById$(update.uid),
						toModel: (entity) =>
							asRecord(util.convertEntityToModel(entity)),
						changed: asRecord(
							util.convertEntityUpdateToModelUpdate(
								update as unknown as MusicianEntityUpdate
							)
						),
						path: (model) =>
							documentPath(
								null,
								MUSICIAN_FEATURE_KEY,
								model,
								false
							),
					}),
				create: (entity) =>
					proposals.proposeNew({
						featureKey: MUSICIAN_FEATURE_KEY,
						entityType: EntityTypeEnum.Musician,
						entity: asRecord(
							util.convertEntityAddToModelAdd(
								entity as unknown as MusicianEntityAdd
							)
						),
						parentPath: () => null,
						needsParent: false,
					}),
			});
		},
	};
}
