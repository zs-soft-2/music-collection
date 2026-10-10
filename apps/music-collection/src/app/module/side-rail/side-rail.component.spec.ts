import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { NgxPermissionsModule } from 'ngx-permissions';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AuthenticationStateService,
	AuthorizationService,
} from '@music-collection/api';

import { SideRailComponent } from './side-rail.component';
import { SideRailService } from './side-rail.service';

/**
 * What the drawer has to get right is not the list of links — the bar's own
 * tests cover those — but coming and going: closed it must be out of reach,
 * and it must not stay open behind the reader once they have gone somewhere.
 */
describe('SideRailComponent', () => {
	let fixture: ComponentFixture<SideRailComponent>;
	let rail: SideRailService;

	const nav = (): HTMLElement =>
		fixture.nativeElement.querySelector('.rail') as HTMLElement;

	const open = (): void => {
		rail.toggle();
		fixture.detectChanges();
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SideRailComponent, NgxPermissionsModule.forRoot()],
			providers: [
				// Egy mindent elnyelő útvonal: a linkre kattintás itt csak
				// annyit jelent, hogy a navigáció elindult és sikerült.
				provideRouter([{ path: '**', children: [] }]),
				provideI18nTesting(),
				{
					provide: AuthenticationStateService,
					useValue: {
						selectAuthenticatedUser$: () => of(undefined),
						selectIsAuthenticated$: () => of(false),
					},
				},
				{
					provide: AuthorizationService,
					useValue: { removeAll: jest.fn() },
				},
			],
		}).compileComponents();

		rail = TestBed.inject(SideRailService);
		fixture = TestBed.createComponent(SideRailComponent);
		fixture.detectChanges();
	});

	/**
	 * Every load starts with the page in full width: an open drawer would be
	 * standing on the left edge of whatever the reader came to read.
	 */
	it('starts closed, and out of the tab order while it is', () => {
		expect(rail.isOpen()).toBe(false);
		expect(nav().classList).not.toContain('is-open');
		expect(nav().hasAttribute('inert')).toBe(true);
	});

	it('slides in when the toggle asks, and back out on a second ask', () => {
		open();

		expect(nav().classList).toContain('is-open');
		expect(nav().hasAttribute('inert')).toBe(false);

		open();

		expect(nav().classList).not.toContain('is-open');
	});

	/** The page under it is what the link was for; it does not stay in front. */
	it('closes behind a link', () => {
		open();
		(
			fixture.nativeElement.querySelector('.rail .link') as HTMLElement
		).click();
		fixture.detectChanges();

		expect(rail.isOpen()).toBe(false);
	});

	/** The dimmed page is a way out, not just a backdrop. */
	it('closes when the page behind it is clicked', () => {
		open();
		(fixture.nativeElement.querySelector('.scrim') as HTMLElement).click();
		fixture.detectChanges();

		expect(rail.isOpen()).toBe(false);
	});

	it('closes on Escape', () => {
		open();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		fixture.detectChanges();

		expect(rail.isOpen()).toBe(false);
	});
});
