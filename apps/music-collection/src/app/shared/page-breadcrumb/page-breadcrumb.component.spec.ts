import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Crumb, PageBreadcrumbComponent } from './page-breadcrumb.component';

describe('PageBreadcrumbComponent', () => {
	let fixture: ComponentFixture<PageBreadcrumbComponent>;

	const render = (trail: Crumb[]): HTMLElement => {
		fixture.componentRef.setInput('trail', trail);
		fixture.detectChanges();

		return fixture.nativeElement as HTMLElement;
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [PageBreadcrumbComponent],
			providers: [provideRouter([])],
		});

		fixture = TestBed.createComponent(PageBreadcrumbComponent);
	});

	it('links every step up, and leads where it says it does', () => {
		const host = render([
			{ label: 'My Collection', link: '/collection' },
			{ label: 'Nirvana', link: ['/artist', 'nirvana-1'] },
			{ label: 'Nevermind' },
		]);

		expect(
			Array.from(host.querySelectorAll('a')).map((link) => [
				link.textContent?.trim(),
				link.getAttribute('href'),
			])
		).toEqual([
			['My Collection', '/collection'],
			['Nirvana', '/artist/nirvana-1'],
		]);
	});

	it('leaves the page we are on as plain text', () => {
		const host = render([
			{ label: 'Collections', link: '/collections' },
			{ label: 'Heavy Rotation' },
		]);
		const current = host.querySelector('[aria-current="page"]');

		expect(current?.textContent?.trim()).toBe('Heavy Rotation');
		expect(current?.tagName).toBe('SPAN');
	});

	it('does not link the last crumb even when it has one', () => {
		const host = render([
			{ label: 'Collections', link: '/collections' },
			{ label: 'Heavy Rotation', link: '/collections/heavy' },
		]);

		expect(host.querySelectorAll('a').length).toBe(1);
	});

	it('shows the steps up while the name of the page is still unknown', () => {
		const host = render([{ label: 'Collections', link: '/collections' }]);

		// The only crumb is the page's own root: nothing to separate, and it
		// is not a link to itself either.
		expect(host.querySelectorAll('a').length).toBe(0);
		expect(host.querySelector('.pi')).toBeNull();
		expect(host.textContent?.trim()).toBe('Collections');
	});
});
