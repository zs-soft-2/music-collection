import { pageTrail, parentCrumb } from './crumb';

/** The app's own words; the rest of a trail is the data's. */
const t = (key: string) => (key === 'nav.home' ? 'Home' : key);

describe('page trail', () => {
	it('starts every page at the front page', () => {
		expect(pageTrail(t, [{ label: 'Amorphis' }])).toEqual([
			{ label: 'Home', link: '/home' },
			{ label: 'Amorphis' },
		]);
	});

	it('leaves out the steps that are not known yet', () => {
		expect(pageTrail(t, [null, { label: 'Amorphis' }, undefined])).toEqual([
			{ label: 'Home', link: '/home' },
			{ label: 'Amorphis' },
		]);
	});

	it('is the front page alone while the page has no name', () => {
		expect(pageTrail(t, [null])).toEqual([{ label: 'Home', link: '/home' }]);
	});
});

describe('parent crumb', () => {
	it('is the step above the page, for a cold-opened page to fall back on', () => {
		expect(
			parentCrumb([
				{ label: 'Home', link: '/home' },
				{ label: 'Amorphis', link: ['/artist', 'a1'] },
				{ label: 'Tales from the Thousand Lakes' },
			])
		).toEqual({ label: 'Amorphis', link: ['/artist', 'a1'] });
	});

	it('never points at the page we are on, link or no link', () => {
		expect(
			parentCrumb([
				{ label: 'Home', link: '/home' },
				{ label: 'Heavy Rotation', link: '/collections/heavy' },
			])
		).toEqual({ label: 'Home', link: '/home' });
	});

	it('is nothing where there is no step above', () => {
		expect(parentCrumb([{ label: 'Home', link: '/home' }])).toBeNull();
		expect(parentCrumb([])).toBeNull();
	});
});
