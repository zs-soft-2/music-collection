import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideI18nTesting } from '../testing';
import { catalogKey, catalogSlug } from './catalog';
import { McCatalogPipe } from './catalog.pipe';

describe('catalogSlug', () => {
	it('lowercases a plain word', () => {
		expect(catalogSlug('Vinyl')).toBe('vinyl');
	});

	it('joins the words of a name', () => {
		expect(catalogSlug('box set')).toBe('box-set');
		expect(catalogSlug('The Netherlands')).toBe('the-netherlands');
	});

	it('spells out a plus, so that VG and VG+ stay apart', () => {
		expect(catalogSlug('VG')).toBe('vg');
		expect(catalogSlug('VG+')).toBe('vg-plus');
	});

	it('keeps an ampersand from swallowing the words around it', () => {
		expect(catalogSlug('UK & Europe')).toBe('uk-europe');
	});

	it('leaves a number alone', () => {
		expect(catalogSlug('180g')).toBe('180g');
	});

	it('trims what would otherwise hang off the ends', () => {
		expect(catalogSlug('  live  ')).toBe('live');
		expect(catalogSlug('rock & roll!')).toBe('rock-roll');
	});

	it('gives one thing one key however it is written', () => {
		expect(catalogSlug('Box Set')).toBe(catalogSlug('box set'));
	});
});

describe('catalogKey', () => {
	it('names the group and the value', () => {
		expect(catalogKey('format', 'lp')).toBe('catalog.format.lp');
		expect(catalogKey('country', 'The Netherlands')).toBe(
			'catalog.country.the-netherlands'
		);
	});
});

@Component({
	selector: 'mc-catalog-host',
	imports: [McCatalogPipe],
	template: `
		<span class="one">{{ 'lp' | mcCatalog: 'format' }}</span>
		<span class="list">{{ instruments | mcCatalog: 'instrument' }}</span>
		<span class="none">{{ [] | mcCatalog: 'instrument' }}</span>
	`,
})
class CatalogHostComponent {
	// A word the dictionary has and one it has never heard of, which is what
	// a line-up holds: the list's own instruments and whatever an import
	// wrote before there was a list.
	public readonly instruments = ['Drums', 'Hurdy-Gurdy'];
}

describe('mcCatalog', () => {
	let fixture: ComponentFixture<CatalogHostComponent>;

	const text = (selector: string): string =>
		(
			fixture.nativeElement.querySelector(selector) as HTMLElement
		).textContent?.trim() ?? '';

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [CatalogHostComponent],
			providers: [provideI18nTesting()],
		});
		fixture = TestBed.createComponent(CatalogHostComponent);
		fixture.detectChanges();
	});

	it('reads a single value', () => {
		expect(text('.one')).toBe('LP');
	});

	/**
	 * A list on one line, so that a template can hand the pipe a member's
	 * instruments instead of joining them itself — a join would put the
	 * stored English on screen in all three languages.
	 */
	it('reads a list, keeping a value it does not know', () => {
		expect(text('.list')).toBe('Drums, Hurdy-Gurdy');
	});

	it('says nothing for an empty list', () => {
		expect(text('.none')).toBe('');
	});
});
