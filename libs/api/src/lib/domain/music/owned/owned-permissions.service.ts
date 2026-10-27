import { ActionEnum } from '../../../core';
import { OwnedResourceEnum } from './owned-resource.enum';

/**
 * Amit a gyűjtő a saját entitásával tehet.
 *
 * Olvasásra szándékosan nincs permission: a saját collectionjét a tulajdonosa
 * olvashatja, és a szabály ott meg is áll (`allow read: if isSelf(uid)`).
 * A `view…` konstans azt a látszatot keltené, hogy az olvasás kiadható vagy
 * elvehető — nem az.
 */
export class OwnedPermissionsService {
	static readonly createOwnedArtistEntity =
		ActionEnum.CREATE.toString() +
		OwnedResourceEnum.OWNED_ARTIST_ENTITY.toString();
	static readonly updateOwnedArtistEntity =
		ActionEnum.UPDATE.toString() +
		OwnedResourceEnum.OWNED_ARTIST_ENTITY.toString();
	static readonly deleteOwnedArtistEntity =
		ActionEnum.DELETE.toString() +
		OwnedResourceEnum.OWNED_ARTIST_ENTITY.toString();

	static readonly createOwnedAlbumEntity =
		ActionEnum.CREATE.toString() +
		OwnedResourceEnum.OWNED_ALBUM_ENTITY.toString();
	static readonly updateOwnedAlbumEntity =
		ActionEnum.UPDATE.toString() +
		OwnedResourceEnum.OWNED_ALBUM_ENTITY.toString();
	static readonly deleteOwnedAlbumEntity =
		ActionEnum.DELETE.toString() +
		OwnedResourceEnum.OWNED_ALBUM_ENTITY.toString();

	static readonly createOwnedReleaseEntity =
		ActionEnum.CREATE.toString() +
		OwnedResourceEnum.OWNED_RELEASE_ENTITY.toString();
	static readonly updateOwnedReleaseEntity =
		ActionEnum.UPDATE.toString() +
		OwnedResourceEnum.OWNED_RELEASE_ENTITY.toString();
	static readonly deleteOwnedReleaseEntity =
		ActionEnum.DELETE.toString() +
		OwnedResourceEnum.OWNED_RELEASE_ENTITY.toString();

	static readonly createOwnedLabelEntity =
		ActionEnum.CREATE.toString() +
		OwnedResourceEnum.OWNED_LABEL_ENTITY.toString();
	static readonly updateOwnedLabelEntity =
		ActionEnum.UPDATE.toString() +
		OwnedResourceEnum.OWNED_LABEL_ENTITY.toString();
	static readonly deleteOwnedLabelEntity =
		ActionEnum.DELETE.toString() +
		OwnedResourceEnum.OWNED_LABEL_ENTITY.toString();

	static readonly createOwnedMusicianEntity =
		ActionEnum.CREATE.toString() +
		OwnedResourceEnum.OWNED_MUSICIAN_ENTITY.toString();
	static readonly updateOwnedMusicianEntity =
		ActionEnum.UPDATE.toString() +
		OwnedResourceEnum.OWNED_MUSICIAN_ENTITY.toString();
	static readonly deleteOwnedMusicianEntity =
		ActionEnum.DELETE.toString() +
		OwnedResourceEnum.OWNED_MUSICIAN_ENTITY.toString();

	static readonly createOwnedDocumentEntity =
		ActionEnum.CREATE.toString() +
		OwnedResourceEnum.OWNED_DOCUMENT_ENTITY.toString();
	static readonly updateOwnedDocumentEntity =
		ActionEnum.UPDATE.toString() +
		OwnedResourceEnum.OWNED_DOCUMENT_ENTITY.toString();
	static readonly deleteOwnedDocumentEntity =
		ActionEnum.DELETE.toString() +
		OwnedResourceEnum.OWNED_DOCUMENT_ENTITY.toString();

	static readonly createOwnedTrackEntity =
		ActionEnum.CREATE.toString() +
		OwnedResourceEnum.OWNED_TRACK_ENTITY.toString();
	static readonly updateOwnedTrackEntity =
		ActionEnum.UPDATE.toString() +
		OwnedResourceEnum.OWNED_TRACK_ENTITY.toString();
	static readonly deleteOwnedTrackEntity =
		ActionEnum.DELETE.toString() +
		OwnedResourceEnum.OWNED_TRACK_ENTITY.toString();

	static readonly createOwnedContributionEntity =
		ActionEnum.CREATE.toString() +
		OwnedResourceEnum.OWNED_CONTRIBUTION_ENTITY.toString();
	static readonly updateOwnedContributionEntity =
		ActionEnum.UPDATE.toString() +
		OwnedResourceEnum.OWNED_CONTRIBUTION_ENTITY.toString();
	static readonly deleteOwnedContributionEntity =
		ActionEnum.DELETE.toString() +
		OwnedResourceEnum.OWNED_CONTRIBUTION_ENTITY.toString();

	static readonly createOwnedMembershipEntity =
		ActionEnum.CREATE.toString() +
		OwnedResourceEnum.OWNED_MEMBERSHIP_ENTITY.toString();
	static readonly updateOwnedMembershipEntity =
		ActionEnum.UPDATE.toString() +
		OwnedResourceEnum.OWNED_MEMBERSHIP_ENTITY.toString();
	static readonly deleteOwnedMembershipEntity =
		ActionEnum.DELETE.toString() +
		OwnedResourceEnum.OWNED_MEMBERSHIP_ENTITY.toString();
}
