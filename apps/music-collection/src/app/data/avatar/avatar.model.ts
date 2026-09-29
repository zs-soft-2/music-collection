/**
 * The collector's own character: what it may be made of, and which drawn
 * layers a given choice adds up to.
 *
 * Nothing here touches Angular or Firebase — the same functions answer the
 * editor's live preview and the canvas that renders the saved picture, which
 * is the whole point: a picture that does not match the preview is a bug, and
 * one shared source of truth is how it stays impossible.
 */

/** The build every garment is drawn for. */
export const AVATAR_BODIES = ['slim', 'regular', 'broad', 'heavy'] as const;
export const AVATAR_AGES = ['20', '30', '40', '50', '60', '70'] as const;
export const AVATAR_FACES = ['stubble', 'beard', 'longbeard', 'sharp'] as const;
export const AVATAR_HAIRS = [
	'short',
	'buzz',
	'undercut',
	'mohawk',
	'long',
	'curly',
	'mullet',
	'topknot',
] as const;
export const AVATAR_GLASSES = [
	'none',
	'biker',
	'roundmetal',
	'mirror',
	'blood',
] as const;
export const AVATAR_SHIRT_STYLES = ['black', 'camo'] as const;
export const AVATAR_OUTFITS = [
	'shirt',
	'sleeveless',
	'vest',
	'acidvest',
	'blackvest',
	'redvest',
	'olivevest',
	'leather',
	'denim',
] as const;
export const AVATAR_PANTS = ['black', 'blue', 'acid', 'leather'] as const;
export const AVATAR_WRISTS = ['none', 'plain', 'studded', 'longstud'] as const;
export const AVATAR_NECKLACES = [
	'none',
	'chain',
	'skull',
	'pentagram',
	'pick',
	'dogtag',
	'tooth',
] as const;
export const AVATAR_PATCHES = ['none', 'star', 'bolt', 'skull'] as const;
export const AVATAR_TATTOOS = ['none', 'star', 'bolt'] as const;

export type AvatarBody = (typeof AVATAR_BODIES)[number];
export type AvatarAge = (typeof AVATAR_AGES)[number];
export type AvatarFace = (typeof AVATAR_FACES)[number];
export type AvatarHair = (typeof AVATAR_HAIRS)[number];
export type AvatarGlasses = (typeof AVATAR_GLASSES)[number];
export type AvatarShirtStyle = (typeof AVATAR_SHIRT_STYLES)[number];
export type AvatarOutfit = (typeof AVATAR_OUTFITS)[number];
export type AvatarPants = (typeof AVATAR_PANTS)[number];
export type AvatarWrist = (typeof AVATAR_WRISTS)[number];
export type AvatarNecklace = (typeof AVATAR_NECKLACES)[number];
export type AvatarPatch = (typeof AVATAR_PATCHES)[number];
export type AvatarTattoo = (typeof AVATAR_TATTOOS)[number];

/** Which way the character is turned. */
export type AvatarView = 'front' | 'back';

/** One assembled character. */
export interface AvatarLook {
	body: AvatarBody;
	age: AvatarAge;
	face: AvatarFace;
	hair: AvatarHair;
	glasses: AvatarGlasses;
	shirtStyle: AvatarShirtStyle;
	outfit: AvatarOutfit;
	pants: AvatarPants;
	wrist: AvatarWrist;
	necklace: AvatarNecklace;
	/** Shows on the back of a vest or jacket, and only there. */
	patch: AvatarPatch;
	tattoo: AvatarTattoo;
}

/** The character the editor opens on. */
export const DEFAULT_AVATAR: AvatarLook = {
	body: 'regular',
	age: '30',
	face: 'stubble',
	hair: 'short',
	glasses: 'none',
	shirtStyle: 'black',
	outfit: 'vest',
	pants: 'black',
	wrist: 'none',
	necklace: 'none',
	patch: 'star',
	tattoo: 'none',
};

/** The drawn size of every layer, and so of the rendered picture. */
export const AVATAR_SIZE = { width: 1024, height: 1536 } as const;

/**
 * The extra tattoo, which is drawn rather than photographed.
 *
 * It is given in the layers' own coordinates, so the preview (an SVG on the
 * same viewBox) and the saved picture (a canvas of the same size) place it at
 * exactly the same spot. It used to be positioned against the stage instead,
 * with the download hard-coding a third position of its own and dropping the
 * rotation — so where the ink sat depended on the size of the window, and the
 * saved picture never quite matched what the collector had been looking at.
 *
 * The spot was measured against all four builds: on the forearm, above the
 * wristbands (a long studded one reaches to about 1100) and inside the arm's
 * outline on the slim figure as well as the heavy one.
 */
export const AVATAR_TATTOO_MARK = {
	x: 132,
	y: 1000,
	fontSize: 60,
	rotation: -20,
	color: '#202027',
	opacity: 0.85,
} as const;

/** The glyph inked for each choice. */
export const AVATAR_TATTOO_GLYPHS: Record<AvatarTattoo, string> = {
	none: '',
	star: '✦',
	bolt: 'ϟ',
};

/** Vests share one cut, and so share the shirt drawn under them. */
const VESTS: readonly AvatarOutfit[] = [
	'vest',
	'acidvest',
	'blackvest',
	'redvest',
	'olivevest',
];

/** The outfits whose back is also drawn over a camouflage shirt. */
const CAMO_BACKS: readonly AvatarOutfit[] = ['shirt', 'sleeveless', ...VESTS];

/** A jacket or vest has a back for a patch to sit on; a t-shirt has not. */
export function hasOuterwear(outfit: AvatarOutfit): boolean {
	return outfit !== 'shirt' && outfit !== 'sleeveless';
}

/** A sleeve covers the ink, so the arm has to be bare for it to show. */
export function showsTattoo(look: AvatarLook): boolean {
	return (
		look.tattoo !== 'none' &&
		look.outfit !== 'leather' &&
		look.outfit !== 'denim'
	);
}

/**
 * The image files the look is drawn from, back to front — the order they are
 * stacked in, which is the order they are both shown and rendered in.
 *
 * `black` trousers and `short` hair are drawn into the base figures already,
 * and `stubble` into the faces, so those choices add no layer of their own.
 */
export function avatarLayers(look: AvatarLook, view: AvatarView): string[] {
	return view === 'back' ? backLayers(look) : frontLayers(look);
}

function frontLayers(look: AvatarLook): string[] {
	const { body } = look;
	const layers = [`${look.outfit}-${body}.webp`];

	if (look.shirtStyle === 'camo') {
		const under = VESTS.includes(look.outfit) ? 'vest' : look.outfit;

		layers.push(`camo-under-${under}-${body}.webp`);
	}

	if (look.pants !== 'black') {
		layers.push(`pants-${look.pants}-${body}.webp`);
	}

	layers.push(`age-${look.age}.webp`);

	if (look.necklace !== 'none') {
		layers.push(`necklace-${look.necklace}.webp`);
	}

	if (look.face !== 'stubble') {
		layers.push(`face-${look.face}.webp`);
	}

	if (look.hair !== 'short') {
		layers.push(`hair-${look.hair}.webp`);
	}

	if (look.glasses !== 'none') {
		layers.push(`glasses-${look.glasses}.webp`);
	}

	if (look.wrist !== 'none') {
		layers.push(`wrist-${look.wrist}-${body}.webp`);
	}

	return layers;
}

function backLayers(look: AvatarLook): string[] {
	const { body } = look;
	const camo =
		look.shirtStyle === 'camo' && CAMO_BACKS.includes(look.outfit)
			? 'camo-'
			: '';
	const layers = [`back-${camo}${look.outfit}-${body}.webp`];

	if (look.pants !== 'black') {
		layers.push(`back-pants-${look.pants}-${look.outfit}-${body}.webp`);
	}

	if (look.patch !== 'none' && hasOuterwear(look.outfit)) {
		layers.push(`back-patch-${look.patch}.webp`);
	}

	if (look.hair !== 'short') {
		layers.push(`back-hair-${look.hair}.webp`);
	}

	return layers;
}

/** The thumbnail a hair choice is offered with. */
export function avatarHairThumbnail(hair: AvatarHair): string {
	return `thumb-${hair}.webp`;
}

/**
 * Every file the whole wardrobe is made of, which is what the upload script
 * checks itself against — a look that asks for a file nobody uploaded draws
 * a hole, and this is the list that makes that impossible to miss.
 */
export function allAvatarLayers(): string[] {
	const files = new Set<string>();
	const add = (look: AvatarLook) => {
		avatarLayers(look, 'front').forEach((file) => files.add(file));
		avatarLayers(look, 'back').forEach((file) => files.add(file));
	};

	for (const body of AVATAR_BODIES) {
		for (const outfit of AVATAR_OUTFITS) {
			for (const shirtStyle of AVATAR_SHIRT_STYLES) {
				for (const pants of AVATAR_PANTS) {
					add({
						...DEFAULT_AVATAR,
						body,
						outfit,
						shirtStyle,
						pants,
					});
				}
			}
		}

		for (const wrist of AVATAR_WRISTS) {
			add({ ...DEFAULT_AVATAR, body, wrist });
		}
	}

	for (const age of AVATAR_AGES) {
		add({ ...DEFAULT_AVATAR, age });
	}

	for (const face of AVATAR_FACES) {
		add({ ...DEFAULT_AVATAR, face });
	}

	for (const hair of AVATAR_HAIRS) {
		add({ ...DEFAULT_AVATAR, hair });
		files.add(avatarHairThumbnail(hair));
	}

	for (const glasses of AVATAR_GLASSES) {
		add({ ...DEFAULT_AVATAR, glasses });
	}

	for (const necklace of AVATAR_NECKLACES) {
		add({ ...DEFAULT_AVATAR, necklace });
	}

	for (const patch of AVATAR_PATCHES) {
		add({ ...DEFAULT_AVATAR, patch });
	}

	return [...files].sort();
}

/** A stored value, or the default where it is not one of ours. */
function one<T extends string>(
	value: unknown,
	allowed: readonly T[],
	fallback: T
): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * A look read back from a document written by an older version — or by hand
 * — with every choice kept to something the wardrobe actually has. A file
 * name is built from these, so an unchecked value would ask Storage for a
 * picture that does not exist.
 */
export function toAvatarLook(data: Record<string, unknown>): AvatarLook {
	return {
		body: one(data['body'], AVATAR_BODIES, DEFAULT_AVATAR.body),
		age: one(data['age'], AVATAR_AGES, DEFAULT_AVATAR.age),
		face: one(data['face'], AVATAR_FACES, DEFAULT_AVATAR.face),
		hair: one(data['hair'], AVATAR_HAIRS, DEFAULT_AVATAR.hair),
		glasses: one(data['glasses'], AVATAR_GLASSES, DEFAULT_AVATAR.glasses),
		shirtStyle: one(
			data['shirtStyle'],
			AVATAR_SHIRT_STYLES,
			DEFAULT_AVATAR.shirtStyle
		),
		outfit: one(data['outfit'], AVATAR_OUTFITS, DEFAULT_AVATAR.outfit),
		pants: one(data['pants'], AVATAR_PANTS, DEFAULT_AVATAR.pants),
		wrist: one(data['wrist'], AVATAR_WRISTS, DEFAULT_AVATAR.wrist),
		necklace: one(
			data['necklace'],
			AVATAR_NECKLACES,
			DEFAULT_AVATAR.necklace
		),
		patch: one(data['patch'], AVATAR_PATCHES, DEFAULT_AVATAR.patch),
		tattoo: one(data['tattoo'], AVATAR_TATTOOS, DEFAULT_AVATAR.tattoo),
	};
}

/** Whether two looks would draw the same character. */
export function sameAvatarLook(a: AvatarLook, b: AvatarLook): boolean {
	return (Object.keys(a) as (keyof AvatarLook)[]).every(
		(key) => a[key] === b[key]
	);
}
