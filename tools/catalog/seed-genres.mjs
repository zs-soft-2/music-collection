#!/usr/bin/env node
/**
 * Writes the genre taxonomy — the genres and the styles under them — into the
 * catalog.
 *
 *   node tools/catalog/seed-genres.mjs [--env dev|prod] [--confirm] [--force]
 *
 * Until now the catalog knew one genre, `Rock`, written into an enum, with a
 * flat list of its fifty-odd styles beside it. Both are data from here on
 * (`genre/{slug}`), edited on the admin page; this script is what puts the
 * first list there — the rock styles exactly as the enum spelled them, so the
 * styles already saved on the artists and albums keep matching, and the other
 * Discogs genres with a starting list under each.
 *
 * The document id is the slug, so the script is safe to re-run: a genre
 * already there is left alone. `--force` overwrites it, which is how a
 * starting list is corrected — it also throws away styles an admin has added
 * since, so it is for a genre nobody has touched yet.
 *
 * Needs Firebase Admin credentials (GOOGLE_APPLICATION_CREDENTIALS or
 * `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { ENV_OPTION, readEnvironment } from '../sync/environment.mjs';
import { stamp, touchCatalog } from '../sync/catalog-sync.mjs';

const FEATURE_KEY = 'genre';
/** `libs/common/api` EntityTypeEnum.Genre. */
const ENTITY_TYPE = 'Genre';

/**
 * The rock styles as the retired `StyleEnum` spelled them, to the letter.
 * Every artist and album of the catalog carries these names, and a style the
 * taxonomy spells differently would fall out of the forms and out of the
 * matching (`toCatalogStyle`) alike.
 */
const ROCK_STYLES = [
	'Alternative metal',
	'Alternative Rock',
	'Ambient',
	'Avantgarde metal',
	'Bay Area Thrash',
	'Black',
	'Blackened Doom',
	'Blackened Thrash',
	'Blues Rock',
	'Brutal Death',
	'Celtic Folk metal',
	'Death',
	'Death Doom',
	'Deathgrind',
	'Doom',
	'Drone',
	'Experimental',
	'First wave of black metal',
	'Folk metal',
	'Funk Rock',
	'Glam Metal',
	'Glam Rock',
	'Gothenburg',
	'Gothic',
	'Gothic Doom',
	'Grindcore',
	'Groove',
	'Groove Thrash',
	'Grunge',
	'Hard rock',
	'Heavy metal',
	'Math Rock',
	'Melodic Death',
	'Melodic Doom',
	'Metalcore',
	'New Wave Of British Heavy Metal',
	'Noise',
	'Noise Rock',
	'Pagan Thrash',
	'Post-Rock',
	'Power metal',
	'Progressive Death',
	'Progressive metal',
	'Progressive Thrash',
	'Psychedelic Rock',
	'Rap Rock',
	'Rock',
	'Space Rock',
	'Speed',
	'Symphonic Heavy metal',
	'Technical Death',
	'Technical Thrash',
	'Teutonic Thrash',
	'Thrash',
	'US Power metal',
];

/**
 * The genres as Discogs divides them, with a starting list of styles under
 * each — the ones a record of that genre is most often filed under there.
 * They are a starting point, not the whole of Discogs' list: the admin page
 * is where a missing style is added, and a name typed there the way Discogs
 * spells it matches an import by itself.
 */
const GENRES = [
	{
		name: 'Rock',
		description:
			'Rock and everything that grew out of it, metal included — as on Discogs, where metal is a style of rock rather than a genre of its own.',
		styles: ROCK_STYLES,
	},
	{
		name: 'Blues',
		description: 'Blues, from the Delta to the electric bands.',
		styles: [
			'Chicago Blues',
			'Country Blues',
			'Delta Blues',
			'Electric Blues',
			'Harmonica Blues',
			'Jump Blues',
			'Louisiana Blues',
			'Modern Electric Blues',
			'Piano Blues',
			'Rhythm & Blues',
			'Texas Blues',
		],
	},
	{
		name: 'Classical',
		description: 'Written music, from the medieval to the contemporary.',
		styles: [
			'Baroque',
			'Choral',
			'Classical',
			'Contemporary',
			'Impressionist',
			'Medieval',
			'Modern',
			'Neo-Classical',
			'Opera',
			'Post-Modern',
			'Renaissance',
			'Romantic',
		],
	},
	{
		name: 'Electronic',
		description: 'Music made with machines, from the dance floor to the ambient room.',
		styles: [
			'Abstract',
			'Acid House',
			'Breakbeat',
			'Broken Beat',
			'Dark Ambient',
			'Deep House',
			'Downtempo',
			'Drum n Bass',
			'Dub Techno',
			'Dubstep',
			'EBM',
			'Electro',
			'Experimental',
			'House',
			'IDM',
			'Industrial',
			'Minimal',
			'Progressive House',
			'Synth-pop',
			'Techno',
			'Trance',
			'Trip Hop',
		],
	},
	{
		name: 'Folk, World, & Country',
		description:
			'Folk and country, and the music of the places the other genres do not name.',
		styles: [
			'Bluegrass',
			'Cajun',
			'Celtic',
			'Country',
			'Country Rock',
			'Fado',
			'Flamenco',
			'Folk',
			'Folk Rock',
			'Gospel',
			'Honky Tonk',
			'Indian Classical',
			'Klezmer',
			'Nordic',
			'Romani',
			'Singer-Songwriter',
			'Volksmusik',
		],
	},
	{
		name: 'Funk / Soul',
		description: 'Funk, soul and what the two made together.',
		styles: [
			'Afrobeat',
			'Contemporary R&B',
			'Disco',
			'Free Funk',
			'Funk',
			'Gospel',
			'Neo Soul',
			'New Jack Swing',
			'P.Funk',
			'Psychedelic',
			'Rhythm & Blues',
			'Soul',
			'Swingbeat',
		],
	},
	{
		name: 'Hip Hop',
		description: 'Hip hop, from the boom bap records to the instrumental ones.',
		styles: [
			'Bass Music',
			'Boom Bap',
			'Conscious',
			'Crunk',
			'Electro',
			'Gangsta',
			'Grime',
			'Hardcore Hip-Hop',
			'Instrumental',
			'Jazzy Hip-Hop',
			'Pop Rap',
			'Ragga HipHop',
			'Trap',
			'Trip Hop',
		],
	},
	{
		name: 'Jazz',
		description: 'Jazz, from the big bands to free improvisation.',
		styles: [
			'Avant-garde Jazz',
			'Big Band',
			'Bop',
			'Contemporary Jazz',
			'Cool Jazz',
			'Dixieland',
			'Easy Listening',
			'Free Improvisation',
			'Free Jazz',
			'Fusion',
			'Hard Bop',
			'Jazz-Funk',
			'Jazz-Rock',
			'Modal',
			'Post Bop',
			'Ragtime',
			'Smooth Jazz',
			'Soul-Jazz',
			'Swing',
		],
	},
	{
		name: 'Latin',
		description: 'The music of Latin America and its diaspora.',
		styles: [
			'Bachata',
			'Bolero',
			'Bossanova',
			'Cha-Cha',
			'Cumbia',
			'Descarga',
			'Mambo',
			'Merengue',
			'MPB',
			'Norteño',
			'Ranchera',
			'Salsa',
			'Samba',
			'Son',
			'Tango',
		],
	},
	{
		name: 'Pop',
		description: 'Pop, from the vocal groups to the chanson.',
		styles: [
			'Ballad',
			'Bubblegum',
			'Chanson',
			'Europop',
			'Indie Pop',
			'J-pop',
			'K-pop',
			'Novelty',
			'Parody',
			'Power Pop',
			'Schlager',
			'Vocal',
		],
	},
	{
		name: 'Reggae',
		description: 'Reggae and the Jamaican music around it.',
		styles: [
			'Calypso',
			'Dancehall',
			'Dub',
			'Dub Poetry',
			'Lovers Rock',
			'Ragga',
			'Reggae',
			'Reggae-Pop',
			'Rocksteady',
			'Roots Reggae',
			'Ska',
			'Steel Band',
		],
	},
	{
		name: 'Stage & Screen',
		description: 'Music written for a film, a stage or a game.',
		styles: [
			'Musical',
			'Score',
			'Soundtrack',
			'Theme',
			'Video Game Music',
		],
	},
	{
		name: 'Brass & Military',
		description: 'Brass bands, marches and military music.',
		styles: ['Brass Band', 'Marches', 'Military', 'Pipe & Drum'],
	},
	{
		name: "Children's",
		description: 'Records made for children: stories, nursery rhymes, education.',
		styles: ['Educational', 'Nursery Rhymes', 'Story'],
	},
	{
		name: 'Non-Music',
		description:
			'Records that are not music: spoken word, field recordings, sound effects.',
		styles: [
			'Audiobook',
			'Comedy',
			'Dialogue',
			'Field Recording',
			'Interview',
			'Poetry',
			'Public Broadcast',
			'Radioplay',
			'Special Effects',
			'Spoken Word',
		],
	},
];

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		confirm: { type: 'boolean', default: false },
		force: { type: 'boolean', default: false },
	},
});

/** Mirrors `toGenreSlug` (libs/api): the id a genre is pointed at by. */
function toSlug(name) {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function toDocument(genre) {
	const slug = toSlug(genre.name);

	return {
		active: true,
		description: genre.description,
		entityType: ENTITY_TYPE,
		name: genre.name,
		slug,
		styles: [...genre.styles].sort((left, right) => left.localeCompare(right)),
		uid: slug,
	};
}

const { projectId } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId });

const db = getFirestore();
const collection = db.collection(FEATURE_KEY);
const existing = new Set((await collection.get()).docs.map((doc) => doc.id));

console.log(`${projectId}: ${FEATURE_KEY}`);

const writes = [];

for (const genre of GENRES) {
	const document = toDocument(genre);

	if (existing.has(document.slug) && !options.force) {
		console.log(`  skip    ${document.slug} (already there)`);
		continue;
	}

	writes.push(document);
	console.log(
		`  ${existing.has(document.slug) ? 'update' : 'create'}  ${document.slug}` +
			` — ${document.name}, ${document.styles.length} styles`
	);
}

if (!writes.length) {
	console.log('nothing to write');
	process.exit(0);
}
if (!options.confirm) {
	console.log(`DRY RUN — ${writes.length} document(s); add --confirm`);
	process.exit(0);
}

const batch = db.batch();

for (const document of writes) {
	batch.set(collection.doc(document.uid), stamp(document));
}

await batch.commit();
await touchCatalog(db, [FEATURE_KEY]);

console.log(`written ${writes.length}, ${FEATURE_KEY} touched`);
