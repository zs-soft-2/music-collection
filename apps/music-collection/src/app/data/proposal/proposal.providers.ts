import { Provider, inject } from '@angular/core';
import {
	ALBUM_FEATURE_KEY,
	ARTIST_FEATURE_KEY,
	AlbumEntity,
	AlbumEntityUpdate,
	AlbumStateService,
	AlbumUtilService,
	ArtistEntity,
	ArtistEntityUpdate,
	ArtistStateService,
	ArtistUtilService,
	EntityTypeEnum,
	LABEL_FEATURE_KEY,
	LabelEntity,
	LabelEntityUpdate,
	LabelStateService,
	LabelUtilService,
	MUSICIAN_FEATURE_KEY,
	MusicianEntity,
	MusicianEntityUpdate,
	MusicianStateService,
	MusicianUtilService,
	RELEASE_FEATURE_KEY,
	ReleaseEntity,
	ReleaseEntityUpdate,
	ReleaseStateService,
	ReleaseUtilService,
} from '@music-collection/api';

import { ProposalService } from './proposal.service';
import { ProposedUpdate, proposalStateProxy } from './proposal-state.proxy';

/**
 * What a page needs to let the catalog's own form propose instead of save:
 * one provider, which swaps the entity's state service for a proxy of it.
 *
 * `skipSelf` is what makes it possible — the proxy is built around the real
 * service from the injector above, so every question the form asks still
 * reaches the catalog.
 *
 * The path of each entity is written out rather than derived: an album lives
 * under its artist and a release under its album, and that is the shape of
 * the catalog, not a rule that can be guessed from a feature key.
 */

/** The uid of an entity referenced by a model field, e.g. an album's artist. */
const referenced = (model: Record<string, unknown>, field: string): string =>
	String((model[field] as { uid?: string } | undefined)?.uid ?? '');

const asRecord = (value: unknown): Record<string, unknown> =>
	value as Record<string, unknown>;

export function provideArtistProposal(): Provider {
	return {
		provide: ArtistStateService,
		useFactory: () => {
			const real = inject(ArtistStateService, { skipSelf: true });
			const proposals = inject(ProposalService);
			const util = inject(ArtistUtilService);

			return proposalStateProxy(real, (update: ProposedUpdate) =>
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
						`${ARTIST_FEATURE_KEY}/${String(model['uid'])}`,
				})
			);
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

			return proposalStateProxy(real, (update: ProposedUpdate) =>
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
					path: (model) => {
						const artist = referenced(model, 'artist');

						return artist
							? `${ARTIST_FEATURE_KEY}/${artist}/${ALBUM_FEATURE_KEY}/${String(model['uid'])}`
							: null;
					},
				})
			);
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

			return proposalStateProxy(real, (update: ProposedUpdate) =>
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
					path: (model) => {
						const artist = referenced(model, 'artist');
						const album = referenced(model, 'album');

						return artist && album
							? `${ARTIST_FEATURE_KEY}/${artist}/${ALBUM_FEATURE_KEY}/${album}/${RELEASE_FEATURE_KEY}/${String(model['uid'])}`
							: null;
					},
				})
			);
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

			return proposalStateProxy(real, (update: ProposedUpdate) =>
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
						`${LABEL_FEATURE_KEY}/${String(model['uid'])}`,
				})
			);
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

			return proposalStateProxy(real, (update: ProposedUpdate) =>
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
						`${MUSICIAN_FEATURE_KEY}/${String(model['uid'])}`,
				})
			);
		},
	};
}
