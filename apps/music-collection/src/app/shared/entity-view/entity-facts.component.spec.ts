import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { EntityFact, EntityFactsComponent } from './entity-facts.component';

describe('EntityFactsComponent', () => {
	let fixture: ComponentFixture<EntityFactsComponent>;

	const render = (facts: EntityFact[]): HTMLElement => {
		fixture.componentRef.setInput('facts', facts);
		fixture.detectChanges();

		return fixture.nativeElement as HTMLElement;
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [EntityFactsComponent],
			providers: [provideRouter([])],
		}).compileComponents();

		fixture = TestBed.createComponent(EntityFactsComponent);
	});

	it('leaves out what was never filled in', () => {
		const host = render([
			{ label: 'Country', value: 'Europe' },
			{ label: 'Format', value: null },
			{ label: 'Weight', value: '' },
		]);

		expect(
			Array.from(host.querySelectorAll('dt')).map((term) =>
				term.textContent?.trim()
			)
		).toEqual(['Country']);
	});

	it('links a fact that stands for another record', () => {
		const host = render([
			{ label: 'Label', value: 'Sub Pop', link: ['/label', '1'] },
			{
				label: 'Discogs',
				value: 'Open',
				href: 'https://www.discogs.com/release/2',
			},
		]);
		const links = Array.from(host.querySelectorAll('a'));

		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			'/label/1',
			'https://www.discogs.com/release/2',
		]);
		expect(links[1].getAttribute('target')).toBe('_blank');
	});
});
