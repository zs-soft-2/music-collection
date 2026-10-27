/**
 * The catalog, the collections and the collectors of the genres the catalog
 * barely knows — read by `seed-genre-catalog.mjs`, `seed-collections.mjs` and
 * `seed-mock-collectors.mjs`.
 *
 * Until now everything in the catalog was rock: three hundred artists and
 * nearly three thousand albums under one genre, with the other fourteen
 * genres of the taxonomy standing empty. A genre-scoped client
 * (`user/{uid}/setting/genre-scope`) that chose any of them got a working app
 * with nothing in it, the collection pages had nothing to resolve against,
 * and the collectors' wall showed the one real collector there is.
 *
 * So this is a seed, and it says so: every id here starts with `seed-`, which
 * is what makes the scripts re-runnable and what `--remove` goes by. The
 * records themselves are real — real bands, real albums, real years — because
 * a demo of a record collection is only worth looking at if the records are
 * ones a collector would recognize. Covers are not here: the scripts can ask
 * the Cover Art Archive for them (`--covers`), which is the same place the
 * imported albums' covers come from.
 *
 * What is deliberately missing: tracklists, credits and line-ups. Those come
 * with a Discogs import (`tools/discogs/add-band.mjs`), which is the way to
 * deepen any of these artists later; a hand-written seed cannot invent a
 * tracklist worth having.
 *
 * Every style below must exist under its genre in `genre/{slug}` — the
 * taxonomy is data, and a style the taxonomy does not know falls out of the
 * forms and out of the matching alike. `seed-genre-catalog.mjs` checks this
 * before it writes anything.
 */

/**
 * Where an artist's country is left out on purpose: `CountryEnum` holds
 * eighteen countries, and Jamaica, Austria and Estonia are not among them.
 * The country is a picker on the artist form, so widening it is a product
 * decision rather than a seeding one — the origin is in the description
 * instead, the way the Discogs import leaves it to the admin.
 */

export const JAZZ = {
	genre: 'Jazz',
	slug: 'jazz',
	artists: [
		{
			slug: 'miles-davis',
			name: 'Miles Davis',
			artistType: 'formation',
			country: 'USA',
			description:
				'Trumpeter from Alton, Illinois, and the one musician who stood at the front of four separate changes in jazz: bebop with Charlie Parker, the cool nonet, modal playing, and the electric bands of the seventies.',
			styles: ['Modal', 'Hard Bop', 'Fusion'],
			albums: [
				{
					slug: 'milestones',
					name: 'Milestones',
					year: 1958,
					styles: ['Hard Bop', 'Modal'],
				},
				{
					slug: 'kind-of-blue',
					name: 'Kind of Blue',
					year: 1959,
					styles: ['Modal', 'Cool Jazz'],
				},
				{
					slug: 'in-a-silent-way',
					name: 'In a Silent Way',
					year: 1969,
					styles: ['Fusion'],
				},
				{
					slug: 'bitches-brew',
					name: 'Bitches Brew',
					year: 1970,
					styles: ['Fusion', 'Jazz-Rock'],
				},
			],
		},
		{
			slug: 'john-coltrane',
			name: 'John Coltrane',
			artistType: 'formation',
			country: 'USA',
			description:
				'Saxophonist whose decade as a leader ran from hard bop to free playing. The quartet with McCoy Tyner, Jimmy Garrison and Elvin Jones is the band most of these records are.',
			styles: ['Modal', 'Hard Bop', 'Free Jazz'],
			albums: [
				{
					slug: 'blue-train',
					name: 'Blue Train',
					year: 1958,
					styles: ['Hard Bop'],
				},
				{
					slug: 'giant-steps',
					name: 'Giant Steps',
					year: 1960,
					styles: ['Hard Bop'],
				},
				{
					slug: 'my-favorite-things',
					name: 'My Favorite Things',
					year: 1961,
					styles: ['Modal', 'Hard Bop'],
				},
				{
					slug: 'a-love-supreme',
					name: 'A Love Supreme',
					year: 1965,
					styles: ['Modal', 'Post Bop'],
				},
			],
		},
		{
			slug: 'art-blakey',
			name: 'Art Blakey & The Jazz Messengers',
			artistType: 'formation',
			country: 'USA',
			description:
				'The drummer and the band he kept going for thirty-five years, and which taught a generation of players their trade — a hard bop school with a changing class.',
			styles: ['Hard Bop'],
			albums: [
				{
					slug: 'a-night-at-birdland',
					name: 'A Night at Birdland, Volume 1',
					year: 1954,
					styles: ['Hard Bop'],
				},
				{
					slug: 'moanin',
					name: "Moanin'",
					year: 1959,
					styles: ['Hard Bop'],
				},
			],
		},
		{
			slug: 'charles-mingus',
			name: 'Charles Mingus',
			artistType: 'formation',
			country: 'USA',
			description:
				'Bassist, composer and bandleader who wrote for the players in front of him rather than for the page, and whose records sit between hard bop and what came after it.',
			styles: ['Post Bop', 'Avant-garde Jazz'],
			albums: [
				{
					slug: 'mingus-ah-um',
					name: 'Mingus Ah Um',
					year: 1959,
					styles: ['Post Bop', 'Hard Bop'],
				},
				{
					slug: 'the-black-saint-and-the-sinner-lady',
					name: 'The Black Saint and the Sinner Lady',
					year: 1963,
					styles: ['Avant-garde Jazz', 'Post Bop'],
				},
			],
		},
		{
			slug: 'herbie-hancock',
			name: 'Herbie Hancock',
			artistType: 'formation',
			country: 'USA',
			description:
				'Pianist of the second Miles Davis quintet, then a leader whose own bands went from post bop to the electric funk of the Headhunters.',
			styles: ['Post Bop', 'Jazz-Funk', 'Fusion'],
			albums: [
				{
					slug: 'maiden-voyage',
					name: 'Maiden Voyage',
					year: 1965,
					styles: ['Post Bop', 'Modal'],
				},
				{
					slug: 'head-hunters',
					name: 'Head Hunters',
					year: 1973,
					styles: ['Jazz-Funk', 'Fusion'],
				},
			],
		},
		{
			slug: 'ornette-coleman',
			name: 'Ornette Coleman',
			artistType: 'formation',
			country: 'USA',
			description:
				'Alto saxophonist who took the chord changes away and left the players to each other. The two records here are what gave free jazz its name.',
			styles: ['Free Jazz', 'Avant-garde Jazz'],
			albums: [
				{
					slug: 'the-shape-of-jazz-to-come',
					name: 'The Shape of Jazz to Come',
					year: 1959,
					styles: ['Free Jazz', 'Avant-garde Jazz'],
				},
				{
					slug: 'free-jazz',
					name: 'Free Jazz: A Collective Improvisation',
					year: 1961,
					styles: ['Free Jazz'],
				},
			],
		},
		{
			slug: 'dave-brubeck',
			name: 'The Dave Brubeck Quartet',
			artistType: 'formation',
			country: 'USA',
			description:
				'The quartet with Paul Desmond on alto, which took odd time signatures onto the radio and sold a jazz record to people who owned no others.',
			styles: ['Cool Jazz'],
			albums: [
				{
					slug: 'time-out',
					name: 'Time Out',
					year: 1959,
					styles: ['Cool Jazz'],
				},
			],
		},
	],
	collections: [
		{
			slug: 'jazz-modal',
			name: 'Modal Jazz',
			description:
				'The records that left the chord changes behind and played on scales instead — a handful of albums between 1958 and 1965 that the rest of jazz then followed.',
			icon: 'pi pi-compass',
			styles: ['Modal'],
			badge: {
				name: 'Modal Master',
				description: 'Own every modal album in the catalog.',
			},
		},
		{
			slug: 'jazz-hard-bop',
			name: 'Hard Bop 1954–1965',
			description:
				'Blues and gospel back in bebop, played by small bands in New York clubs — the decade when a jazz quintet was a working band with a van.',
			icon: 'pi pi-bolt',
			styles: ['Hard Bop'],
			years: { from: 1954, to: 1965 },
			badge: {
				name: 'Hard Bop Historian',
				description: 'Own every hard bop album of the first decade.',
			},
		},
		{
			slug: 'jazz-free',
			name: 'Free Jazz',
			description:
				'Where the changes, and then the bar lines, were given up altogether.',
			icon: 'pi pi-sun',
			styles: ['Free Jazz', 'Avant-garde Jazz'],
			badge: {
				name: 'Free Player',
				description: 'Own every free and avant-garde album in the catalog.',
			},
		},
	],
	collector: {
		slug: 'nora',
		displayName: 'Nóra Kis',
		countryCode: 'HU',
		city: 'Budapest',
		/** The collection they finished, and which therefore earns points. */
		completed: 'jazz-modal',
		/** Shown on the public page: a hunt kept private stays private. */
		shown: ['jazz-modal', 'jazz-hard-bop'],
		copies: [
			{ album: 'kind-of-blue', media: 'vinyl', note: 'Second-hand, Budapest flea market.' },
			{ album: 'milestones', media: 'vinyl' },
			{ album: 'a-love-supreme', media: 'vinyl', note: 'The one I play for people who say they do not like jazz.' },
			{ album: 'my-favorite-things', media: 'vinyl' },
			{ album: 'maiden-voyage', media: 'cd' },
			{ album: 'blue-train', media: 'vinyl' },
			{ album: 'giant-steps', media: 'vinyl' },
			{ album: 'moanin', media: 'vinyl' },
			{ album: 'time-out', media: 'cd' },
			{ album: 'mingus-ah-um', media: 'vinyl' },
			{ album: 'the-shape-of-jazz-to-come', media: 'vinyl' },
			{ album: 'bitches-brew', media: 'vinyl', note: 'Gatefold, worn at the corners.' },
			{ album: 'head-hunters', media: 'cd' },
		],
		wishes: [
			{ album: 'a-night-at-birdland', medias: ['vinyl'] },
			{ album: 'free-jazz', medias: ['vinyl', 'cd'] },
			{ album: 'in-a-silent-way', medias: ['vinyl'] },
		],
	},
};

export const ELECTRONIC = {
	genre: 'Electronic',
	slug: 'electronic',
	artists: [
		{
			slug: 'kraftwerk',
			name: 'Kraftwerk',
			artistType: 'band',
			country: 'Germany',
			formedIn: 1970,
			description:
				'Düsseldorf. Four records between 1974 and 1981 that nearly everything made with a machine since has to answer to, whether it knows it or not.',
			styles: ['Synth-pop', 'Electro'],
			albums: [
				{
					slug: 'autobahn',
					name: 'Autobahn',
					year: 1974,
					styles: ['Synth-pop', 'Electro'],
				},
				{
					slug: 'trans-europe-express',
					name: 'Trans-Europe Express',
					year: 1977,
					styles: ['Synth-pop', 'Electro'],
				},
				{
					slug: 'the-man-machine',
					name: 'The Man-Machine',
					year: 1978,
					styles: ['Synth-pop', 'Electro'],
				},
				{
					slug: 'computer-world',
					name: 'Computer World',
					year: 1981,
					styles: ['Synth-pop', 'Electro'],
				},
			],
		},
		{
			slug: 'aphex-twin',
			name: 'Aphex Twin',
			artistType: 'project',
			country: 'UK',
			description:
				'Richard D. James, Cornwall. The name under which bedroom techno turned into something nobody had a genre for, which is how the word IDM came to be used at all.',
			styles: ['IDM', 'Techno'],
			albums: [
				{
					slug: 'selected-ambient-works-85-92',
					name: 'Selected Ambient Works 85–92',
					year: 1992,
					styles: ['IDM', 'Techno'],
				},
				{
					slug: 'richard-d-james-album',
					name: 'Richard D. James Album',
					year: 1996,
					styles: ['IDM'],
				},
			],
		},
		{
			slug: 'underworld',
			name: 'Underworld',
			artistType: 'band',
			country: 'UK',
			formedIn: 1987,
			description:
				'Karl Hyde and Rick Smith, with Darren Emerson for the records here: long tracks built for a room rather than for a single, and a voice talking over them.',
			styles: ['Techno', 'Progressive House'],
			albums: [
				{
					slug: 'dubnobasswithmyheadman',
					name: 'Dubnobasswithmyheadman',
					year: 1994,
					styles: ['Techno', 'Progressive House'],
				},
				{
					slug: 'second-toughest-in-the-infants',
					name: 'Second Toughest in the Infants',
					year: 1996,
					styles: ['Techno', 'Drum n Bass'],
				},
			],
		},
		{
			slug: 'daft-punk',
			name: 'Daft Punk',
			artistType: 'band',
			country: 'France',
			formedIn: 1993,
			description:
				'Thomas Bangalter and Guy-Manuel de Homem-Christo, Paris. French house made out of filtered disco records, and then a second album that was mostly about the hooks.',
			styles: ['House', 'Electro'],
			albums: [
				{
					slug: 'homework',
					name: 'Homework',
					year: 1997,
					styles: ['House', 'Electro'],
				},
				{
					slug: 'discovery',
					name: 'Discovery',
					year: 2001,
					styles: ['House', 'Synth-pop'],
				},
			],
		},
		{
			slug: 'jeff-mills',
			name: 'Jeff Mills',
			artistType: 'project',
			country: 'USA',
			description:
				'Detroit, and the hardest end of what that city made: stripped-down techno played fast on three decks.',
			styles: ['Techno', 'Minimal'],
			albums: [
				{
					slug: 'waveform-transmission-vol-1',
					name: 'Waveform Transmission Vol. 1',
					year: 1992,
					styles: ['Techno', 'Minimal'],
				},
			],
		},
		{
			slug: 'carl-craig',
			name: 'Carl Craig',
			artistType: 'project',
			country: 'USA',
			description:
				'Detroit second wave: techno with jazz chords in it, made by someone who had been listening to Detroit radio and to Europe at the same time.',
			styles: ['Techno', 'Deep House'],
			albums: [
				{
					slug: 'landcruising',
					name: 'Landcruising',
					year: 1995,
					styles: ['Techno', 'Deep House'],
				},
			],
		},
	],
	collections: [
		{
			slug: 'electronic-techno',
			name: 'Techno',
			description:
				'Detroit and what Europe made of it — the albums, not the twelve-inches.',
			icon: 'pi pi-bolt',
			styles: ['Techno'],
			badge: {
				name: 'Four to the Floor',
				description: 'Own every techno album in the catalog.',
			},
		},
		{
			slug: 'electronic-synth-pop',
			name: 'The Machines 1974–1985',
			description:
				'Pop played on synthesizers while that still had to be explained to people: the Düsseldorf records and what followed them.',
			icon: 'pi pi-desktop',
			styles: ['Synth-pop'],
			years: { from: 1974, to: 1985 },
			badge: {
				name: 'Man-Machine',
				description: 'Own every synth-pop album of the first decade.',
			},
		},
		{
			slug: 'electronic-house',
			name: 'House',
			description: 'Chicago by way of Paris: disco cut up and put back together.',
			icon: 'pi pi-home',
			styles: ['House'],
			badge: {
				name: 'Filter Disco',
				description: 'Own every house album in the catalog.',
			},
		},
	],
	collector: {
		slug: 'bence',
		displayName: 'Bence Halmi',
		countryCode: 'HU',
		city: 'Debrecen',
		completed: 'electronic-synth-pop',
		shown: ['electronic-synth-pop', 'electronic-techno'],
		copies: [
			{ album: 'autobahn', media: 'vinyl' },
			{ album: 'trans-europe-express', media: 'vinyl', note: 'Bought twice; the first one warped in a car.' },
			{ album: 'the-man-machine', media: 'vinyl' },
			{ album: 'computer-world', media: 'vinyl' },
			{ album: 'selected-ambient-works-85-92', media: 'cd' },
			{ album: 'richard-d-james-album', media: 'cd' },
			{ album: 'dubnobasswithmyheadman', media: 'vinyl' },
			{ album: 'homework', media: 'vinyl' },
			{ album: 'discovery', media: 'vinyl' },
			{ album: 'waveform-transmission-vol-1', media: 'vinyl' },
		],
		wishes: [
			{ album: 'landcruising', medias: ['vinyl'] },
			{ album: 'second-toughest-in-the-infants', medias: ['vinyl', 'cd'] },
		],
	},
};

export const HIP_HOP = {
	genre: 'Hip Hop',
	slug: 'hip-hop',
	artists: [
		{
			slug: 'a-tribe-called-quest',
			name: 'A Tribe Called Quest',
			artistType: 'band',
			country: 'USA',
			formedIn: 1985,
			description:
				'Queens, New York. Q-Tip, Phife Dawg, Ali Shaheed Muhammad and Jarobi White, and three albums built on records their parents owned.',
			styles: ['Jazzy Hip-Hop', 'Boom Bap'],
			albums: [
				{
					slug: 'peoples-instinctive-travels',
					name: "People's Instinctive Travels and the Paths of Rhythm",
					year: 1990,
					styles: ['Jazzy Hip-Hop', 'Boom Bap'],
				},
				{
					slug: 'the-low-end-theory',
					name: 'The Low End Theory',
					year: 1991,
					styles: ['Jazzy Hip-Hop', 'Boom Bap'],
				},
				{
					slug: 'midnight-marauders',
					name: 'Midnight Marauders',
					year: 1993,
					styles: ['Jazzy Hip-Hop', 'Boom Bap'],
				},
			],
		},
		{
			slug: 'nas',
			name: 'Nas',
			artistType: 'project',
			country: 'USA',
			description:
				'Queensbridge. A first album of ten tracks that most lists of the best hip hop records still put at the top, and a second that went for the charts and got them.',
			styles: ['Boom Bap', 'Conscious'],
			albums: [
				{
					slug: 'illmatic',
					name: 'Illmatic',
					year: 1994,
					styles: ['Boom Bap', 'Conscious'],
				},
				{
					slug: 'it-was-written',
					name: 'It Was Written',
					year: 1996,
					styles: ['Boom Bap'],
				},
			],
		},
		{
			slug: 'wu-tang-clan',
			name: 'Wu-Tang Clan',
			artistType: 'band',
			country: 'USA',
			formedIn: 1992,
			description:
				'Staten Island, nine members, kung fu films and a piano sample — and a deal that let each of them sign somewhere else as a solo act.',
			styles: ['Hardcore Hip-Hop', 'Boom Bap'],
			albums: [
				{
					slug: 'enter-the-wu-tang',
					name: 'Enter the Wu-Tang (36 Chambers)',
					year: 1993,
					styles: ['Hardcore Hip-Hop', 'Boom Bap'],
				},
				{
					slug: 'wu-tang-forever',
					name: 'Wu-Tang Forever',
					year: 1997,
					styles: ['Hardcore Hip-Hop'],
				},
			],
		},
		{
			slug: 'public-enemy',
			name: 'Public Enemy',
			artistType: 'band',
			country: 'USA',
			formedIn: 1985,
			description:
				'Long Island. Chuck D, Flavor Flav and the Bomb Squad, who made a wall of samples and put politics on the radio over it.',
			styles: ['Conscious', 'Hardcore Hip-Hop'],
			albums: [
				{
					slug: 'it-takes-a-nation-of-millions',
					name: 'It Takes a Nation of Millions to Hold Us Back',
					year: 1988,
					styles: ['Conscious', 'Hardcore Hip-Hop'],
				},
				{
					slug: 'fear-of-a-black-planet',
					name: 'Fear of a Black Planet',
					year: 1990,
					styles: ['Conscious'],
				},
			],
		},
		{
			slug: 'de-la-soul',
			name: 'De La Soul',
			artistType: 'band',
			country: 'USA',
			formedIn: 1987,
			description:
				'Long Island, and the record that gave hip hop a different voice for a while — then a second one that spent its length arguing with the first.',
			styles: ['Jazzy Hip-Hop', 'Conscious'],
			albums: [
				{
					slug: 'three-feet-high-and-rising',
					name: '3 Feet High and Rising',
					year: 1989,
					styles: ['Jazzy Hip-Hop', 'Conscious'],
				},
				{
					slug: 'de-la-soul-is-dead',
					name: 'De La Soul Is Dead',
					year: 1991,
					styles: ['Jazzy Hip-Hop'],
				},
			],
		},
		{
			slug: 'gang-starr',
			name: 'Gang Starr',
			artistType: 'band',
			country: 'USA',
			formedIn: 1986,
			description:
				'Guru and DJ Premier: a rapper who never raised his voice and a producer who chopped jazz records into drums.',
			styles: ['Boom Bap', 'Jazzy Hip-Hop'],
			albums: [
				{
					slug: 'hard-to-earn',
					name: 'Hard to Earn',
					year: 1994,
					styles: ['Boom Bap', 'Jazzy Hip-Hop'],
				},
				{
					slug: 'moment-of-truth',
					name: 'Moment of Truth',
					year: 1998,
					styles: ['Boom Bap'],
				},
			],
		},
		{
			slug: 'dj-shadow',
			name: 'DJ Shadow',
			artistType: 'project',
			country: 'USA',
			description:
				'California. An album made entirely out of other records, assembled in the basement of a shop that sold them.',
			styles: ['Instrumental', 'Trip Hop'],
			albums: [
				{
					slug: 'endtroducing',
					name: 'Endtroducing.....',
					year: 1996,
					styles: ['Instrumental', 'Trip Hop'],
				},
			],
		},
	],
	collections: [
		{
			slug: 'hip-hop-boom-bap',
			name: 'Boom Bap 1988–1998',
			description:
				'The decade when a hip hop album was a drum break, a bassline and someone with something to say.',
			icon: 'pi pi-bolt',
			styles: ['Boom Bap'],
			years: { from: 1988, to: 1998 },
			badge: {
				name: 'Golden Age',
				description: 'Own every boom bap album of the golden age.',
			},
		},
		{
			slug: 'hip-hop-jazzy',
			name: 'Jazzy Hip-Hop',
			description:
				'Records built on their parents\' jazz collection — the Native Tongues and what Premier did with the same crates.',
			icon: 'pi pi-compass',
			styles: ['Jazzy Hip-Hop'],
			badge: {
				name: 'Low End Theory',
				description: 'Own every jazzy hip hop album in the catalog.',
			},
		},
		{
			slug: 'hip-hop-conscious',
			name: 'Conscious Rap',
			description: 'The records that argued.',
			icon: 'pi pi-megaphone',
			styles: ['Conscious'],
			badge: {
				name: 'Nation of Millions',
				description: 'Own every conscious rap album in the catalog.',
			},
		},
	],
	collector: {
		slug: 'daniel',
		displayName: 'Dániel Kovács',
		countryCode: 'HU',
		city: 'Szeged',
		completed: 'hip-hop-jazzy',
		shown: ['hip-hop-jazzy', 'hip-hop-boom-bap'],
		copies: [
			{ album: 'the-low-end-theory', media: 'vinyl', note: 'The first record I bought with my own money.' },
			{ album: 'midnight-marauders', media: 'vinyl' },
			{ album: 'peoples-instinctive-travels', media: 'vinyl' },
			{ album: 'three-feet-high-and-rising', media: 'vinyl' },
			{ album: 'de-la-soul-is-dead', media: 'cd' },
			{ album: 'hard-to-earn', media: 'vinyl' },
			{ album: 'illmatic', media: 'vinyl' },
			{ album: 'enter-the-wu-tang', media: 'cd' },
			{ album: 'it-takes-a-nation-of-millions', media: 'vinyl' },
			{ album: 'endtroducing', media: 'vinyl' },
			{ album: 'moment-of-truth', media: 'cd' },
		],
		wishes: [
			{ album: 'fear-of-a-black-planet', medias: ['vinyl'] },
			{ album: 'it-was-written', medias: ['vinyl'] },
			{ album: 'wu-tang-forever', medias: ['vinyl'] },
		],
	},
};

export const FUNK_SOUL = {
	genre: 'Funk / Soul',
	slug: 'funk-soul',
	artists: [
		{
			slug: 'james-brown',
			name: 'James Brown',
			artistType: 'formation',
			country: 'USA',
			description:
				'The band that stopped playing songs and started playing the first beat of the bar. Everything filed under funk starts somewhere in these records.',
			styles: ['Funk', 'Soul'],
			albums: [
				{
					slug: 'sex-machine',
					name: 'Sex Machine',
					year: 1970,
					styles: ['Funk'],
				},
				{
					slug: 'the-payback',
					name: 'The Payback',
					year: 1973,
					styles: ['Funk'],
				},
			],
		},
		{
			slug: 'funkadelic',
			name: 'Funkadelic',
			artistType: 'band',
			country: 'USA',
			formedIn: 1968,
			description:
				'George Clinton\'s rock band — the louder half of P-Funk, with Eddie Hazel\'s guitar at the front of it.',
			styles: ['P.Funk', 'Psychedelic'],
			albums: [
				{
					slug: 'maggot-brain',
					name: 'Maggot Brain',
					year: 1971,
					styles: ['P.Funk', 'Psychedelic'],
				},
				{
					slug: 'one-nation-under-a-groove',
					name: 'One Nation Under a Groove',
					year: 1978,
					styles: ['P.Funk', 'Funk'],
				},
			],
		},
		{
			slug: 'parliament',
			name: 'Parliament',
			artistType: 'band',
			country: 'USA',
			formedIn: 1968,
			description:
				'The same musicians as Funkadelic under a different name and a horn section: the dance records, the mothership and the stage show.',
			styles: ['P.Funk', 'Funk'],
			albums: [
				{
					slug: 'mothership-connection',
					name: 'Mothership Connection',
					year: 1975,
					styles: ['P.Funk', 'Funk'],
				},
			],
		},
		{
			slug: 'stevie-wonder',
			name: 'Stevie Wonder',
			artistType: 'project',
			country: 'USA',
			description:
				'Motown\'s child star who, at twenty-one, took control of his own records and spent five years making them nearly alone.',
			styles: ['Soul', 'Funk'],
			albums: [
				{
					slug: 'talking-book',
					name: 'Talking Book',
					year: 1972,
					styles: ['Soul'],
				},
				{
					slug: 'innervisions',
					name: 'Innervisions',
					year: 1973,
					styles: ['Soul', 'Funk'],
				},
				{
					slug: 'songs-in-the-key-of-life',
					name: 'Songs in the Key of Life',
					year: 1976,
					styles: ['Soul'],
				},
			],
		},
		{
			slug: 'marvin-gaye',
			name: 'Marvin Gaye',
			artistType: 'project',
			country: 'USA',
			description:
				'The Motown singer who delivered a record the label did not want and was proved right about it within a month.',
			styles: ['Soul'],
			albums: [
				{
					slug: 'whats-going-on',
					name: "What's Going On",
					year: 1971,
					styles: ['Soul'],
				},
				{
					slug: 'lets-get-it-on',
					name: "Let's Get It On",
					year: 1973,
					styles: ['Soul'],
				},
			],
		},
		{
			slug: 'sly-and-the-family-stone',
			name: 'Sly & the Family Stone',
			artistType: 'band',
			country: 'USA',
			formedIn: 1966,
			description:
				'San Francisco. Mixed band, mixed audience, and two records that went from the brightest thing on the radio to the bleakest in two years.',
			styles: ['Funk', 'Psychedelic'],
			albums: [
				{
					slug: 'stand',
					name: 'Stand!',
					year: 1969,
					styles: ['Funk', 'Psychedelic'],
				},
				{
					slug: 'theres-a-riot-goin-on',
					name: "There's a Riot Goin' On",
					year: 1971,
					styles: ['Funk', 'Soul'],
				},
			],
		},
		{
			slug: 'curtis-mayfield',
			name: 'Curtis Mayfield',
			artistType: 'project',
			country: 'USA',
			description:
				'Chicago. The Impressions\' writer on his own, and a film soundtrack that contradicts the film it was written for.',
			styles: ['Soul', 'Funk'],
			albums: [
				{
					slug: 'super-fly',
					name: 'Super Fly',
					year: 1972,
					styles: ['Soul', 'Funk'],
				},
			],
		},
		{
			slug: 'earth-wind-and-fire',
			name: 'Earth, Wind & Fire',
			artistType: 'band',
			country: 'USA',
			formedIn: 1969,
			description:
				'Chicago by way of Los Angeles: a horn section, a falsetto and arrangements that took funk onto the biggest stages going.',
			styles: ['Funk', 'Disco'],
			albums: [
				{
					slug: 'thats-the-way-of-the-world',
					name: "That's the Way of the World",
					year: 1975,
					styles: ['Funk', 'Disco'],
				},
			],
		},
	],
	collections: [
		{
			slug: 'funk-soul-p-funk',
			name: 'P.Funk',
			description:
				'The Clinton records under both names: the band that built a spaceship for a stage set.',
			icon: 'pi pi-star',
			styles: ['P.Funk'],
			badge: {
				name: 'One Nation',
				description: 'Own every P-Funk album in the catalog.',
			},
		},
		{
			slug: 'funk-soul-seventies',
			name: 'Soul in the Seventies',
			description:
				'The decade soul stopped making singles and started making albums about something.',
			icon: 'pi pi-heart',
			styles: ['Soul'],
			years: { from: 1970, to: 1979 },
			badge: {
				name: 'What\'s Going On',
				description: 'Own every seventies soul album in the catalog.',
			},
		},
		{
			slug: 'funk-soul-funk',
			name: 'Funk',
			description: 'On the one.',
			icon: 'pi pi-bolt',
			styles: ['Funk'],
			badge: {
				name: 'On the One',
				description: 'Own every funk album in the catalog.',
			},
		},
	],
	collector: {
		slug: 'eszter',
		displayName: 'Eszter Tóth',
		countryCode: 'HU',
		city: 'Pécs',
		completed: 'funk-soul-p-funk',
		shown: ['funk-soul-p-funk', 'funk-soul-seventies'],
		copies: [
			{ album: 'maggot-brain', media: 'vinyl', note: 'Ten minutes of guitar and nothing else on the A side.' },
			{ album: 'one-nation-under-a-groove', media: 'vinyl' },
			{ album: 'mothership-connection', media: 'vinyl' },
			{ album: 'whats-going-on', media: 'vinyl' },
			{ album: 'innervisions', media: 'vinyl' },
			{ album: 'talking-book', media: 'vinyl' },
			{ album: 'super-fly', media: 'vinyl' },
			{ album: 'theres-a-riot-goin-on', media: 'cd' },
			{ album: 'sex-machine', media: 'vinyl' },
			{ album: 'the-payback', media: 'vinyl' },
			{ album: 'stand', media: 'cd' },
			{ album: 'thats-the-way-of-the-world', media: 'vinyl' },
		],
		wishes: [
			{ album: 'songs-in-the-key-of-life', medias: ['vinyl'] },
			{ album: 'lets-get-it-on', medias: ['vinyl'] },
		],
	},
};

export const REGGAE = {
	genre: 'Reggae',
	slug: 'reggae',
	artists: [
		{
			slug: 'bob-marley-and-the-wailers',
			name: 'Bob Marley & The Wailers',
			artistType: 'band',
			country: null,
			formedIn: 1963,
			description:
				'Trench Town, Kingston, Jamaica. The band that took Jamaican music out of Jamaica, from the Island albums of 1973 onwards.',
			styles: ['Roots Reggae', 'Reggae'],
			albums: [
				{
					slug: 'catch-a-fire',
					name: 'Catch a Fire',
					year: 1973,
					styles: ['Roots Reggae'],
				},
				{
					slug: 'natty-dread',
					name: 'Natty Dread',
					year: 1974,
					styles: ['Roots Reggae'],
				},
				{
					slug: 'exodus',
					name: 'Exodus',
					year: 1977,
					styles: ['Roots Reggae', 'Reggae'],
				},
				{
					slug: 'kaya',
					name: 'Kaya',
					year: 1978,
					styles: ['Roots Reggae', 'Lovers Rock'],
				},
			],
		},
		{
			slug: 'peter-tosh',
			name: 'Peter Tosh',
			artistType: 'project',
			country: null,
			description:
				'Westmoreland, Jamaica. One of the three original Wailers, and on his own the most openly political of them.',
			styles: ['Roots Reggae'],
			albums: [
				{
					slug: 'legalize-it',
					name: 'Legalize It',
					year: 1976,
					styles: ['Roots Reggae'],
				},
				{
					slug: 'equal-rights',
					name: 'Equal Rights',
					year: 1977,
					styles: ['Roots Reggae'],
				},
			],
		},
		{
			slug: 'burning-spear',
			name: 'Burning Spear',
			artistType: 'band',
			country: null,
			description:
				'Winston Rodney, Saint Ann\'s Bay, Jamaica: roots reggae as history lessons, sung over one of the heaviest rhythm sections of the seventies.',
			styles: ['Roots Reggae'],
			albums: [
				{
					slug: 'marcus-garvey',
					name: 'Marcus Garvey',
					year: 1975,
					styles: ['Roots Reggae'],
				},
			],
		},
		{
			slug: 'augustus-pablo',
			name: 'Augustus Pablo',
			artistType: 'project',
			country: null,
			description:
				'Kingston, Jamaica. The melodica player whose records with King Tubby are where dub stops being a B side and becomes an album.',
			styles: ['Dub'],
			albums: [
				{
					slug: 'king-tubbys-meets-rockers-uptown',
					name: 'King Tubbys Meets Rockers Uptown',
					year: 1976,
					styles: ['Dub'],
				},
				{
					slug: 'east-of-the-river-nile',
					name: 'East of the River Nile',
					year: 1978,
					styles: ['Dub'],
				},
			],
		},
		{
			slug: 'lee-scratch-perry',
			name: 'Lee "Scratch" Perry',
			artistType: 'project',
			country: null,
			description:
				'Kendal, Jamaica. Producer at the Black Ark studio, who treated the mixing desk as the instrument and the tape as the song.',
			styles: ['Dub'],
			albums: [
				{
					slug: 'super-ape',
					name: 'Super Ape',
					year: 1976,
					styles: ['Dub'],
				},
			],
		},
		{
			slug: 'the-skatalites',
			name: 'The Skatalites',
			artistType: 'band',
			country: null,
			formedIn: 1964,
			description:
				'Kingston, Jamaica. The studio band behind most of what came out of Studio One, and the reason ska sounds like a horn section.',
			styles: ['Ska'],
			albums: [
				{
					slug: 'ska-authentic',
					name: 'Ska Authentic',
					year: 1967,
					styles: ['Ska'],
				},
			],
		},
		{
			slug: 'toots-and-the-maytals',
			name: 'Toots & the Maytals',
			artistType: 'band',
			country: null,
			formedIn: 1962,
			description:
				'Kingston, Jamaica. Toots Hibbert sang gospel over ska and rocksteady, and put the word reggae on a record before anyone else did.',
			styles: ['Rocksteady', 'Reggae'],
			albums: [
				{
					slug: 'funky-kingston',
					name: 'Funky Kingston',
					year: 1973,
					styles: ['Rocksteady', 'Reggae'],
				},
			],
		},
	],
	collections: [
		{
			slug: 'reggae-roots',
			name: 'Roots Reggae 1973–1980',
			description:
				'The Kingston albums of the seventies, when a reggae record started being made for a whole side rather than for a sound system.',
			icon: 'pi pi-sun',
			styles: ['Roots Reggae'],
			years: { from: 1973, to: 1980 },
			badge: {
				name: 'Roots Man',
				description: 'Own every roots reggae album of the seventies.',
			},
		},
		{
			slug: 'reggae-dub',
			name: 'Dub',
			description:
				'The mixing desk as an instrument: the vocal taken out and the reverb left in.',
			icon: 'pi pi-sliders-h',
			styles: ['Dub'],
			badge: {
				name: 'Black Ark',
				description: 'Own every dub album in the catalog.',
			},
		},
		{
			slug: 'reggae-ska',
			name: 'Ska & Rocksteady',
			description: 'What Kingston played before reggae slowed it down.',
			icon: 'pi pi-forward',
			styles: ['Ska', 'Rocksteady'],
			badge: {
				name: 'Studio One',
				description: 'Own every ska and rocksteady album in the catalog.',
			},
		},
	],
	collector: {
		slug: 'marton',
		displayName: 'Márton Varga',
		countryCode: 'DE',
		city: 'Berlin',
		completed: 'reggae-dub',
		shown: ['reggae-dub', 'reggae-roots'],
		copies: [
			{ album: 'king-tubbys-meets-rockers-uptown', media: 'vinyl', note: 'Berlin record fair, 2019.' },
			{ album: 'east-of-the-river-nile', media: 'vinyl' },
			{ album: 'super-ape', media: 'vinyl' },
			{ album: 'catch-a-fire', media: 'vinyl' },
			{ album: 'natty-dread', media: 'vinyl' },
			{ album: 'exodus', media: 'vinyl' },
			{ album: 'marcus-garvey', media: 'vinyl' },
			{ album: 'legalize-it', media: 'cd' },
			{ album: 'funky-kingston', media: 'vinyl' },
			{ album: 'ska-authentic', media: 'cd' },
		],
		wishes: [
			{ album: 'equal-rights', medias: ['vinyl'] },
			{ album: 'kaya', medias: ['vinyl'] },
		],
	},
};

export const CLASSICAL = {
	genre: 'Classical',
	slug: 'classical',
	artists: [
		{
			slug: 'berliner-philharmoniker',
			name: 'Berliner Philharmoniker',
			artistType: 'formation',
			country: 'Germany',
			formedIn: 1882,
			description:
				'The orchestra as the record sleeves of the sixties and seventies carry it, with Herbert von Karajan in front of it for three decades of Deutsche Grammophon releases.',
			styles: ['Romantic', 'Classical'],
			albums: [
				{
					slug: 'beethoven-symphony-9-karajan',
					name: 'Beethoven: Symphony No. 9 — Karajan',
					year: 1963,
					styles: ['Romantic'],
				},
				{
					slug: 'beethoven-symphony-5-karajan',
					name: 'Beethoven: Symphony No. 5 — Karajan',
					year: 1963,
					styles: ['Romantic'],
				},
			],
		},
		{
			slug: 'wiener-philharmoniker',
			name: 'Wiener Philharmoniker',
			artistType: 'formation',
			country: null,
			formedIn: 1842,
			description:
				'Vienna, Austria. The orchestra of the Musikverein, here in the Beethoven recording Carlos Kleiber made with it in the mid-seventies.',
			styles: ['Romantic', 'Classical'],
			albums: [
				{
					slug: 'beethoven-symphony-7-kleiber',
					name: 'Beethoven: Symphony No. 7 — Kleiber',
					year: 1976,
					styles: ['Romantic'],
				},
			],
		},
		{
			slug: 'glenn-gould',
			name: 'Glenn Gould',
			artistType: 'project',
			country: 'Canada',
			description:
				'Toronto. The pianist who left the concert hall for the recording studio at thirty-one and said so in writing, and whose Bach is what most people mean by Bach on the piano.',
			styles: ['Baroque'],
			albums: [
				{
					slug: 'bach-goldberg-variations-1955',
					name: 'Bach: The Goldberg Variations',
					year: 1956,
					styles: ['Baroque'],
				},
				{
					slug: 'bach-well-tempered-clavier-i',
					name: 'Bach: The Well-Tempered Clavier, Book I',
					year: 1963,
					styles: ['Baroque'],
				},
			],
		},
		{
			slug: 'maria-callas',
			name: 'Maria Callas',
			artistType: 'project',
			country: 'Greece',
			description:
				'Soprano, born in New York to Greek parents and made in Italy: the voice that put acting back into opera recording.',
			styles: ['Opera'],
			albums: [
				{
					slug: 'puccini-tosca-1953',
					name: 'Puccini: Tosca — de Sabata',
					year: 1953,
					styles: ['Opera'],
				},
			],
		},
		{
			slug: 'kronos-quartet',
			name: 'Kronos Quartet',
			artistType: 'formation',
			country: 'USA',
			formedIn: 1973,
			description:
				'San Francisco. A string quartet that plays almost nothing written before it existed, and commissions the rest.',
			styles: ['Contemporary', 'Modern'],
			albums: [
				{
					slug: 'black-angels',
					name: 'Black Angels',
					year: 1990,
					styles: ['Contemporary', 'Modern'],
				},
			],
		},
		{
			slug: 'arvo-part',
			name: 'Arvo Pärt',
			artistType: 'project',
			country: null,
			description:
				'Paide, Estonia. Composer who stopped writing for eight years and came back with tintinnabuli — three notes and a lot of silence.',
			styles: ['Contemporary', 'Neo-Classical'],
			albums: [
				{
					slug: 'tabula-rasa',
					name: 'Tabula Rasa',
					year: 1984,
					styles: ['Contemporary', 'Neo-Classical'],
				},
			],
		},
	],
	collections: [
		{
			slug: 'classical-romantic',
			name: 'The Romantic Symphony',
			description:
				'Beethoven and what came after him, in the recordings the record shops of the sixties and seventies were built on.',
			icon: 'pi pi-book',
			styles: ['Romantic'],
			badge: {
				name: 'Symphonist',
				description: 'Own every romantic symphony recording in the catalog.',
			},
		},
		{
			slug: 'classical-baroque-keyboard',
			name: 'Bach on the Keyboard',
			description: 'The Goldbergs, the Well-Tempered Clavier, and a piano.',
			icon: 'pi pi-table',
			styles: ['Baroque'],
			badge: {
				name: 'Goldberg',
				description: 'Own every baroque keyboard record in the catalog.',
			},
		},
		{
			slug: 'classical-contemporary',
			name: 'Contemporary Classics',
			description: 'Written in living memory, and recorded by the people it was written for.',
			icon: 'pi pi-sparkles',
			styles: ['Contemporary'],
			badge: {
				name: 'Tabula Rasa',
				description: 'Own every contemporary classical record in the catalog.',
			},
		},
	],
	collector: {
		slug: 'julia',
		displayName: 'Julia Reinhardt',
		countryCode: 'AT',
		city: 'Vienna',
		completed: 'classical-baroque-keyboard',
		shown: ['classical-baroque-keyboard', 'classical-romantic'],
		copies: [
			{ album: 'bach-goldberg-variations-1955', media: 'vinyl', note: 'Mono pressing, and better for it.' },
			{ album: 'bach-well-tempered-clavier-i', media: 'vinyl' },
			{ album: 'beethoven-symphony-9-karajan', media: 'vinyl' },
			{ album: 'beethoven-symphony-5-karajan', media: 'vinyl' },
			{ album: 'puccini-tosca-1953', media: 'vinyl' },
			{ album: 'black-angels', media: 'cd' },
			{ album: 'tabula-rasa', media: 'cd' },
		],
		wishes: [{ album: 'beethoven-symphony-7-kleiber', medias: ['vinyl'] }],
	},
};

/** The genres this seed fills in, in the order the scripts work through them. */
export const GENRE_SEED = [
	JAZZ,
	ELECTRONIC,
	HIP_HOP,
	FUNK_SOUL,
	REGGAE,
	CLASSICAL,
];

/** Document id of a seeded artist, album or collector: `seed-…`. */
export const seedUid = (...parts) => `seed-${parts.join('-')}`;

/**
 * The definitions as `seed-collections.mjs` writes them: the criteria wrapped
 * the way the engine reads them, and the format narrowed to studio albums,
 * which is what every album here is.
 *
 * The styles a criterion names are the ones that belong to exactly one genre
 * in the taxonomy. That is not a style choice but a correctness one: the
 * resolver runs over the whole catalog, so a criterion naming `Experimental`
 * or `Electro` — styles the taxonomy files under two genres — would quietly
 * pull rock records into a jazz collection and make it impossible to finish.
 */
export const GENRE_COLLECTIONS = GENRE_SEED.flatMap(({ collections }) =>
	collections.map(({ slug, name, description, icon, styles, years, badge }) => ({
		name,
		slug,
		description,
		icon,
		criteria: {
			styles: { includesAny: styles },
			...(years ? { years } : {}),
			albumFormats: { includesAny: ['lp'] },
		},
		badge: {
			name: badge.name,
			description: badge.description,
			icon,
			artworkUrl: null,
		},
	}))
);

/** Every album of the seed, by its slug — artists and genres resolved. */
export function seededAlbums() {
	const albums = new Map();

	for (const { genre, slug: genreSlug, artists } of GENRE_SEED) {
		for (const artist of artists) {
			for (const album of artist.albums) {
				albums.set(album.slug, {
					...album,
					genre,
					genreSlug,
					artist,
					uid: seedUid(album.slug),
					artistUid: seedUid(artist.slug),
				});
			}
		}
	}

	return albums;
}
