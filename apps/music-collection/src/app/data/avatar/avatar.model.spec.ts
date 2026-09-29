import {
	AVATAR_BODIES,
	AVATAR_OUTFITS,
	DEFAULT_AVATAR,
	allAvatarLayers,
	avatarLayers,
	hasOuterwear,
	showsTattoo,
	toAvatarLook,
} from './avatar.model';

const look = (changes: Partial<typeof DEFAULT_AVATAR> = {}) => ({
	...DEFAULT_AVATAR,
	...changes,
});

describe('avatarLayers', () => {
	it('draws the figure, and nothing else, for the plainest look', () => {
		// Black trousers, short hair and stubble are painted into the base
		// figures already: choosing them adds no layer.
		expect(avatarLayers(look(), 'front')).toEqual([
			'vest-regular.webp',
			'age-30.webp',
		]);
	});

	it('stacks the layers back to front', () => {
		expect(
			avatarLayers(
				look({
					body: 'broad',
					shirtStyle: 'camo',
					pants: 'blue',
					necklace: 'chain',
					face: 'beard',
					hair: 'long',
					glasses: 'biker',
					wrist: 'studded',
				}),
				'front'
			)
		).toEqual([
			'vest-broad.webp',
			'camo-under-vest-broad.webp',
			'pants-blue-broad.webp',
			'age-30.webp',
			'necklace-chain.webp',
			'face-beard.webp',
			'hair-long.webp',
			'glasses-biker.webp',
			'wrist-studded-broad.webp',
		]);
	});

	it('draws every vest over the one shirt they share', () => {
		expect(
			avatarLayers(look({ outfit: 'redvest', shirtStyle: 'camo' }), 'front')
		).toContain('camo-under-vest-regular.webp');
		expect(
			avatarLayers(look({ outfit: 'leather', shirtStyle: 'camo' }), 'front')
		).toContain('camo-under-leather-regular.webp');
	});

	it('takes the trousers from the outfit as well when turned around', () => {
		// The back of the trousers is drawn per outfit: what covers them
		// changes where they start.
		expect(avatarLayers(look({ pants: 'acid' }), 'back')).toEqual([
			'back-vest-regular.webp',
			'back-pants-acid-vest-regular.webp',
			'back-patch-star.webp',
		]);
	});

	it('only sews the patch onto a back there is one', () => {
		expect(avatarLayers(look({ outfit: 'shirt' }), 'back')).toEqual([
			'back-shirt-regular.webp',
		]);
		expect(avatarLayers(look({ outfit: 'denim' }), 'back')).toEqual([
			'back-denim-regular.webp',
			'back-patch-star.webp',
		]);
	});

	it('has a camouflage back for the outfits that show one', () => {
		expect(
			avatarLayers(look({ outfit: 'vest', shirtStyle: 'camo' }), 'back')[0]
		).toBe('back-camo-vest-regular.webp');
		// A leather jacket's back is leather whatever is under it.
		expect(
			avatarLayers(
				look({ outfit: 'leather', shirtStyle: 'camo' }),
				'back'
			)[0]
		).toBe('back-leather-regular.webp');
	});
});

describe('showsTattoo', () => {
	it('needs a bare arm', () => {
		expect(showsTattoo(look({ tattoo: 'star' }))).toBe(true);
		expect(showsTattoo(look({ tattoo: 'star', outfit: 'leather' }))).toBe(
			false
		);
		expect(showsTattoo(look({ tattoo: 'none' }))).toBe(false);
	});
});

describe('hasOuterwear', () => {
	it('is what a patch needs', () => {
		expect(hasOuterwear('shirt')).toBe(false);
		expect(hasOuterwear('sleeveless')).toBe(false);
		expect(hasOuterwear('olivevest')).toBe(true);
	});
});

describe('allAvatarLayers', () => {
	const files = allAvatarLayers();

	it('names every file the wardrobe was drawn with', () => {
		// The count the upload script publishes. It is asserted here because
		// a look that asks for a file nobody uploaded draws a hole, and the
		// list is what the script checks itself against.
		expect(files).toHaveLength(296);
	});

	it('reaches every combination a collector can ask for', () => {
		for (const body of AVATAR_BODIES) {
			for (const outfit of AVATAR_OUTFITS) {
				expect(files).toContain(`${outfit}-${body}.webp`);
				expect(files).toContain(`back-${outfit}-${body}.webp`);
			}
		}
	});

	it('has no duplicates', () => {
		expect(new Set(files).size).toBe(files.length);
	});
});

describe('toAvatarLook', () => {
	it('keeps what a stored document got right', () => {
		expect(toAvatarLook({ ...DEFAULT_AVATAR, hair: 'mullet' }).hair).toBe(
			'mullet'
		);
	});

	it('falls back where a value is not one of ours', () => {
		// A file name is built from these: an unchecked value would ask
		// Storage for a picture that does not exist.
		expect(
			toAvatarLook({ body: '../../etc/passwd', outfit: 42 })
		).toEqual(DEFAULT_AVATAR);
		expect(toAvatarLook({})).toEqual(DEFAULT_AVATAR);
	});
});
