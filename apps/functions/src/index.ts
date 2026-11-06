/**
 * Music Collection — szerveroldali jogosultság-szinkron és Discogs-lekérdezés.
 *
 * A `role/{roleId}.permissions` és a user szerepkör-hivatkozásai
 * (`user/{uid}.roleIds`, illetve a régi, beágyazott `roles`) alapján
 * karbantartja a `security/users/{uid}/effective_permissions` dokumentumot.
 * Ezt olvassa a firestore.rules ÉS a storage.rules (cross-service
 * `firestore.get()`) — egyetlen igazságforrás.
 *
 * Custom claimet SZÁNDÉKOSAN nem írunk: a claimek együtt 1000 bájtba férnek,
 * amit a teljes permission-lista (`createMusicianEntity` és társai) túllépné.
 *
 * A trigger régiója a Firestore adatbázis helye (europe-west4) — eltérő
 * régióval a deploy elszáll.
 *
 * Ez a fájl csak a kideployolt functionöket sorolja fel; a definíciók
 * témánként a `*.functions.ts` fájlokban élnek, a közös beállítás (régió,
 * CPU, App Check, secretek) a `functions-runtime.ts`-ben. Egy itt nem
 * szereplő név a következő deploynál TÖRLŐDIK.
 */

// Elsőként: az Admin SDK indítása és a `setGlobalOptions`. A témafájlok is
// innen importálnak, ez a sor csak kiírja a sorrendet.
import './functions-runtime';

export {
	resyncEffectivePermissions,
	syncRolePermissions,
	syncUserPermissions,
} from './permissions.functions';
export { syncAlbumRating } from './album-rating.functions';
export {
	discogsArtistProfile,
	discogsLabelProfile,
	discogsLabelSearch,
	discogsLookup,
	discogsMasterVersions,
} from './discogs.functions';
export {
	identifyRecordFromPhoto,
	identifyShelfFromPhotos,
} from './photo-scan.functions';
export {
	approveReleaseRequest,
	decideRequest,
	deleteAlbumEntity,
	deleteReleaseEntity,
	ensureGenericRelease,
} from './catalog.functions';
export {
	adoptMusicCollectionBadgeImage,
	createMusicCollectionEntity,
	deleteMusicCollectionEntity,
	generateMusicCollectionBadge,
	readBadgeGenerationSettings,
	setMusicCollectionBadgeImage,
	updateBadgeGenerationSettings,
	updateMusicCollectionEntity,
} from './music-collection.functions';
export {
	refreshUpcomingReleases,
	syncUpcomingReleasesNow,
} from './upcoming-release.functions';
export {
	answerDailyQuestion,
	composeDailyQuestionDaily,
	composeDailyQuestionNow,
	readDailyQuestionSettings,
	refreshDailyQuestionLeaderboardDaily,
	refreshDailyQuestionLeaderboardNow,
	updateDailyQuestionSettings,
} from './daily-question.functions';
export { composeBandOfTheWeekDaily } from './band-of-the-week.functions';
export {
	catalogBundleStatusNow,
	composeGuestBundleDaily,
	rebuildCatalogBundle,
} from './catalog-bundles.functions';
export {
	loadConcertVenues,
	loadConcertsFromMusicBrainz,
	readConcertAiSettings,
	suggestConcerts,
	suggestVenues,
	updateConcertAiSettings,
} from './concert.functions';
export { generateTrackMedia } from './track-media.functions';
