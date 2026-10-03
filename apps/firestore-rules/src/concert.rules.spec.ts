import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	serverTimestamp,
	setDoc,
	updateDoc,
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const VENUE_PATH = 'venue/mbid-park';
const CONCERT_PATH = 'concert/artist-tank_2026-11-12_budapest-park';
const SUGGESTION_PATH =
	'concert-suggestion/artist-tank_2026-12-05_a38';
const ADMIN = 'admin-1';
const COLLECTOR = 'collector-1';

/** What the admin page writes: the venue, plus the sync service's own stamp. */
const venue = (fields: Record<string, unknown> = {}) => ({
	active: true,
	address: 'Budapest, Soroksári út 60',
	city: 'Budapest',
	closedAt: null,
	coordinates: { latitude: 47.4654, longitude: 19.0754 },
	countryCode: 'HU',
	entityType: 'Venue',
	musicBrainzId: 'mbid-park',
	name: 'Budapest Park',
	source: 'musicbrainz',
	type: 'Venue',
	uid: 'mbid-park',
	updatedAt: serverTimestamp(),
	...fields,
});

const concert = (fields: Record<string, unknown> = {}) => ({
	artistImageUrl: null,
	artistName: 'Tankcsapda',
	artistUid: 'artist-tank',
	cancelled: false,
	city: 'Budapest',
	countryCode: 'HU',
	endsAt: null,
	entityType: 'Concert',
	eventType: 'concert',
	matchedBy: 'musicBrainzId',
	musicBrainzArtistIds: [],
	musicBrainzEventId: 'mbid-event',
	source: 'musicbrainz',
	sourceUrl: null,
	startsAt: '2026-11-12',
	startsAtTime: '20:00',
	supportingActs: [],
	ticketUrl: null,
	title: 'Tankcsapda a Parkban',
	uid: 'artist-tank_2026-11-12_budapest-park',
	venueName: 'Budapest Park',
	venueUid: 'mbid-park',
	updatedAt: serverTimestamp(),
	...fields,
});

const suggestion = (fields: Record<string, unknown> = {}) => ({
	...concert(),
	confidence: 0.8,
	matchedBy: 'name',
	model: 'gemini-2.5-flash',
	musicBrainzEventId: null,
	note: 'A zenekar oldalán szerepel.',
	reviewState: 'pending',
	reviewedAt: null,
	reviewedBy: null,
	source: 'ai',
	sourceUrl: 'https://example.test/tank',
	startsAt: '2026-12-05',
	suggestedAt: 1_760_000_000_000,
	uid: 'artist-tank_2026-12-05_a38',
	venueName: 'A38',
	venueUid: null,
	...fields,
});

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await createTestEnvironment();
});

afterAll(() => testEnv.cleanup());

beforeEach(async () => {
	await testEnv.clearFirestore();
	await testEnv.withSecurityRulesDisabled(async (context) => {
		const admin = context.firestore();

		await setDoc(
			doc(admin, `security/users/${ADMIN}/effective_permissions`),
			{
				permissions: [
					'createVenueEntity',
					'updateVenueEntity',
					'deleteVenueEntity',
					'viewConcertEntity',
					'createConcertEntity',
					'updateConcertEntity',
					'deleteConcertEntity',
				],
				roles: ['admin'],
			}
		);
		await setDoc(
			doc(admin, `security/users/${COLLECTOR}/effective_permissions`),
			{
				permissions: ['createCollectionItemEntity'],
				roles: ['collector'],
			}
		);
		await setDoc(doc(admin, VENUE_PATH), venue());
		await setDoc(doc(admin, CONCERT_PATH), concert());
		await setDoc(doc(admin, SUGGESTION_PATH), suggestion());
	});
});

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const asVisitor = () => testEnv.unauthenticatedContext().firestore();

describe('venue/{venueId}', () => {
	it('is readable by a visitor who has not signed in', async () => {
		await assertSucceeds(getDoc(doc(asVisitor(), VENUE_PATH)));
		await assertSucceeds(getDocs(collection(asVisitor(), 'venue')));
	});

	it('is written by whoever may edit the venues', async () => {
		await assertSucceeds(
			setDoc(doc(as(ADMIN), 'venue/a38'), venue({ name: 'A38', uid: 'a38' }))
		);
		await assertSucceeds(deleteDoc(doc(as(ADMIN), VENUE_PATH)));
	});

	it('is not written by a collector or a visitor', async () => {
		await assertFails(setDoc(doc(as(COLLECTOR), VENUE_PATH), venue()));
		await assertFails(setDoc(doc(asVisitor(), VENUE_PATH), venue()));
	});

	it('refuses a venue without a name or a country', async () => {
		await assertFails(setDoc(doc(as(ADMIN), VENUE_PATH), venue({ name: '' })));
		await assertFails(
			setDoc(doc(as(ADMIN), VENUE_PATH), venue({ countryCode: 'HUN' }))
		);
	});

	/** A map and a distance both read these as numbers. */
	it('refuses coordinates written as text', async () => {
		await assertFails(
			setDoc(
				doc(as(ADMIN), VENUE_PATH),
				venue({ coordinates: { latitude: '47.4', longitude: '19.0' } })
			)
		);
	});
});

describe('concert/{concertId}', () => {
	/** The public page reads every filed concert, like the rest of the catalog. */
	it('is readable by a visitor who has not signed in', async () => {
		await assertSucceeds(getDoc(doc(asVisitor(), CONCERT_PATH)));
		await assertSucceeds(getDocs(collection(asVisitor(), 'concert')));
	});

	it('is written by whoever may file concerts', async () => {
		await assertSucceeds(
			setDoc(doc(as(ADMIN), CONCERT_PATH), concert({ startsAtTime: '21:00' }))
		);
		await assertSucceeds(deleteDoc(doc(as(ADMIN), CONCERT_PATH)));
	});

	it('is not written by a collector or a visitor', async () => {
		await assertFails(setDoc(doc(as(COLLECTOR), CONCERT_PATH), concert()));
		await assertFails(setDoc(doc(asVisitor(), CONCERT_PATH), concert()));
	});

	/**
	 * A partial day is refused: the page draws a timeline from these, and the
	 * sweep that clears the past compares them as strings.
	 */
	it('refuses a day that is not a full date', async () => {
		for (const startsAt of ['2026', '2026-11', 'holnap', '']) {
			await assertFails(
				setDoc(doc(as(ADMIN), CONCERT_PATH), concert({ startsAt }))
			);
		}
	});

	it('refuses a start time that is not a time', async () => {
		await assertFails(
			setDoc(doc(as(ADMIN), CONCERT_PATH), concert({ startsAtTime: '8pm' }))
		);
	});

	it('refuses an unknown kind or source', async () => {
		await assertFails(
			setDoc(doc(as(ADMIN), CONCERT_PATH), concert({ eventType: 'party' }))
		);
		await assertFails(
			setDoc(doc(as(ADMIN), CONCERT_PATH), concert({ source: 'guess' }))
		);
	});

	it('refuses a concert with no band or no venue', async () => {
		await assertFails(
			setDoc(doc(as(ADMIN), CONCERT_PATH), concert({ artistUid: '' }))
		);
		await assertFails(
			setDoc(doc(as(ADMIN), CONCERT_PATH), concert({ venueName: '' }))
		);
	});

	// A bill the page prints act by act, every name a link to the catalog.
	it('takes the bill of the night, and refuses an endless one', async () => {
		await assertSucceeds(
			setDoc(
				doc(as(ADMIN), CONCERT_PATH),
				concert({
					lineup: [
						{
							artistUid: 'artist-tank',
							imageUrl: null,
							name: 'Tankcsapda',
						},
						{ artistUid: null, imageUrl: null, name: 'Első' },
					],
				})
			)
		);
		await assertFails(
			setDoc(
				doc(as(ADMIN), CONCERT_PATH),
				concert({
					lineup: Array.from({ length: 32 }, (_, index) => ({
						artistUid: null,
						imageUrl: null,
						name: `Zenekar ${index}`,
					})),
				})
			)
		);
	});
});

describe('concert-suggestion/{suggestionId}', () => {
	/**
	 * The suggestions are deliberately not public. A search-grounded model can
	 * be wrong, and until a person has opened the cited source this is a
	 * candidate rather than a claim.
	 */
	it('is not readable by a visitor or a collector', async () => {
		await assertFails(getDoc(doc(asVisitor(), SUGGESTION_PATH)));
		await assertFails(getDoc(doc(as(COLLECTOR), SUGGESTION_PATH)));
	});

	it('is readable by whoever reviews concerts', async () => {
		await assertSucceeds(getDoc(doc(as(ADMIN), SUGGESTION_PATH)));
		await assertSucceeds(
			getDocs(collection(as(ADMIN), 'concert-suggestion'))
		);
	});

	/** Only the function proposes; a client that could write here could plant one. */
	it('is not created by anybody, admin included', async () => {
		await assertFails(
			setDoc(doc(as(ADMIN), 'concert-suggestion/planted'), suggestion())
		);
	});

	it('takes the decision from whoever reviews concerts', async () => {
		await assertSucceeds(
			updateDoc(doc(as(ADMIN), SUGGESTION_PATH), {
				reviewState: 'rejected',
				reviewedAt: Date.now(),
				reviewedBy: ADMIN,
				updatedAt: serverTimestamp(),
			})
		);
	});

	/**
	 * Only the decision. The night itself is not edited here — a suggestion
	 * worth correcting is filed under `concert` with the corrections.
	 */
	it('refuses a write that changes the night itself', async () => {
		await assertFails(
			updateDoc(doc(as(ADMIN), SUGGESTION_PATH), {
				startsAt: '2027-01-01',
				updatedAt: serverTimestamp(),
			})
		);
		await assertFails(
			updateDoc(doc(as(ADMIN), SUGGESTION_PATH), {
				reviewState: 'rejected',
				venueName: 'Valahol',
				updatedAt: serverTimestamp(),
			})
		);
	});

	it('refuses a review state it does not know', async () => {
		await assertFails(
			updateDoc(doc(as(ADMIN), SUGGESTION_PATH), {
				reviewState: 'published',
				reviewedAt: Date.now(),
				reviewedBy: ADMIN,
				updatedAt: serverTimestamp(),
			})
		);
	});

	it('is not decided by a collector', async () => {
		await assertFails(
			updateDoc(doc(as(COLLECTOR), SUGGESTION_PATH), {
				reviewState: 'rejected',
				reviewedAt: Date.now(),
				reviewedBy: COLLECTOR,
				updatedAt: serverTimestamp(),
			})
		);
	});

	/**
	 * Approving drops the suggestion, which leaves a tombstone so the other
	 * clients take it off their list too.
	 */
	it('lets whoever approves leave the tombstone of the suggestion', async () => {
		await assertSucceeds(deleteDoc(doc(as(ADMIN), SUGGESTION_PATH)));
		await assertSucceeds(
			setDoc(
				doc(
					as(ADMIN),
					'sync/concert-suggestion/deletion/concert-suggestion~artist-tank_2026-12-05_a38'
				),
				{ path: SUGGESTION_PATH, deletedAt: serverTimestamp() }
			)
		);
		await assertFails(
			setDoc(
				doc(
					as(COLLECTOR),
					'sync/concert-suggestion/deletion/concert-suggestion~artist-tank_2026-12-05_a38'
				),
				{ path: SUGGESTION_PATH, deletedAt: serverTimestamp() }
			)
		);
	});
});
