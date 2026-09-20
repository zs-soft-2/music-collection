/**
 * The framework-free core contracts live in `@music-collection/core-api`;
 * this barrel passes them on and adds what still needs Angular (the Firestore
 * client and the two HTTP clients) or the domain entities (export/import,
 * the user's own collection and wishlist).
 */
export * from '@music-collection/core-api';

export * from './entity-quantity/entity-quantity-data.service';
export * from './export-import';
export * from './firebase';
export * from './musicbrainz';
export * from './navigation';
export * from './user/user-data.service';
