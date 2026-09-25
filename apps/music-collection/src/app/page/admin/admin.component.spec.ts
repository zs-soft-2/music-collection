import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ReleaseRequestEffect } from '../../data/release-request';
import { AdminComponent } from './admin.component';

describe('AdminComponent', () => {
	let component: AdminComponent;
	let fixture: ComponentFixture<AdminComponent>;

	beforeEach(async () => {
		localStorage.removeItem('mc-admin-nav-hidden');

		await TestBed.configureTestingModule({
			imports: [AdminComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: ReleaseRequestEffect,
					useValue: { countPending$: () => of(0) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AdminComponent);

		component = fixture.componentInstance;

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('shows the side nav until it is hidden', () => {
		expect(sideNav()).toBeTruthy();
		expect(showButton()).toBeFalsy();

		hideButton().click();
		fixture.detectChanges();

		expect(sideNav()).toBeFalsy();
		expect(showButton()).toBeTruthy();
	});

	it('brings the side nav back', () => {
		hideButton().click();
		fixture.detectChanges();

		showButton().click();
		fixture.detectChanges();

		expect(sideNav()).toBeTruthy();
		expect(showButton()).toBeFalsy();
	});

	it('remembers the hidden side nav in this browser', () => {
		hideButton().click();
		fixture.detectChanges();

		expect(localStorage.getItem('mc-admin-nav-hidden')).toBe('true');

		const next = TestBed.createComponent(AdminComponent);

		next.detectChanges();

		expect(next.nativeElement.querySelector('.side')).toBeFalsy();
	});

	function sideNav(): HTMLElement | null {
		return fixture.nativeElement.querySelector('.side');
	}

	function hideButton(): HTMLButtonElement {
		return fixture.nativeElement.querySelector('.side-hide');
	}

	function showButton(): HTMLButtonElement {
		return fixture.nativeElement.querySelector('.show-menu');
	}
});
