import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ViewActionComponent } from './view-action.component';

describe('ViewActionComponent', () => {
	let fixture: ComponentFixture<ViewActionComponent>;

	const render = (link: unknown[] | null): HTMLElement => {
		fixture.componentRef.setInput('link', link);
		fixture.componentRef.setInput('entity', 'album');
		fixture.componentRef.setInput('name', 'Nevermind');
		fixture.detectChanges();

		return fixture.nativeElement as HTMLElement;
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ViewActionComponent],
			providers: [provideI18nTesting(), provideRouter([])],
		}).compileComponents();

		fixture = TestBed.createComponent(ViewActionComponent);
	});

	it('leads to the page the entity is shown on', () => {
		const link = render(['/album', '1']).querySelector('a');

		expect(link?.getAttribute('href')).toBe('/album/1');
		expect(link?.getAttribute('aria-label')).toBe('View album Nevermind');
	});

	it('is not there at all for an entity with no page', () => {
		const host = render(null);

		expect(host.querySelector('a')).toBeNull();
		expect(host.hasAttribute('hidden')).toBe(true);
	});
});
