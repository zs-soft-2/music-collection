/**
 * A gyűjtő saját entitásai mint jogosultsági erőforrás.
 *
 * A collection neve (`user/{uid}/owned-artist`) a `@music-collection/common/api`
 * `ownedFeatureKey`-éből jön; az erőforrás neve ennek a párja: a katalógus
 * erőforrása `Owned` előtaggal. A `firestore.rules` `syncResources()` mapje
 * ugyanezt a kilenc párt tartja, és abból építi a permissiont
 * (`hasPerm('create' + syncResources()[ownedCollection])`).
 */
export enum OwnedResourceEnum {
	OWNED_ARTIST_ENTITY = 'OwnedArtistEntity',
	OWNED_ALBUM_ENTITY = 'OwnedAlbumEntity',
	OWNED_RELEASE_ENTITY = 'OwnedReleaseEntity',
	OWNED_LABEL_ENTITY = 'OwnedLabelEntity',
	OWNED_MUSICIAN_ENTITY = 'OwnedMusicianEntity',
	OWNED_DOCUMENT_ENTITY = 'OwnedDocumentEntity',
	OWNED_TRACK_ENTITY = 'OwnedTrackEntity',
	OWNED_CONTRIBUTION_ENTITY = 'OwnedContributionEntity',
	OWNED_MEMBERSHIP_ENTITY = 'OwnedMembershipEntity',
}
