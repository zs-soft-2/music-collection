import { Observable, Subject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	ActivatedRouteSnapshot,
	Router,
	RouterStateSnapshot,
	UrlTree,
} from '@angular/router';
import { User as FirebaseUser } from '@angular/fire/auth';
import { AuthenticatedUserService } from '@music-collection/api';

import { authenticatedGuard } from './authenticated.guard';

describe('authenticatedGuard', () => {
	/** Stands in for Firebase: silent until the session is settled. */
	let session$: Subject<FirebaseUser | null>;
	let router: Router;

	/** What the guard answers, collected as it comes. */
	const run = (): (boolean | UrlTree)[] => {
		const answers: (boolean | UrlTree)[] = [];

		TestBed.runInInjectionContext(() => {
			const result = authenticatedGuard(
				{} as ActivatedRouteSnapshot,
				{} as RouterStateSnapshot
			) as Observable<boolean | UrlTree>;

			result.subscribe((answer) => answers.push(answer));
		});

		return answers;
	};

	beforeEach(() => {
		session$ = new Subject<FirebaseUser | null>();

		TestBed.configureTestingModule({
			providers: [
				{
					provide: AuthenticatedUserService,
					useValue: { user$: session$.asObservable() },
				},
				{
					provide: Router,
					useValue: {
						createUrlTree: jest.fn(() => ({}) as UrlTree),
					},
				},
			],
		});
		router = TestBed.inject(Router);
	});

	it('lets a signed-in collector through', () => {
		const answers = run();

		session$.next({ uid: 'u1' } as FirebaseUser);

		expect(answers).toEqual([true]);
	});

	it('sends a guest to the home page', () => {
		const answers = run();

		session$.next(null);

		expect(router.createUrlTree).toHaveBeenCalledWith(['/home']);
		expect(answers).toHaveLength(1);
		expect(answers[0]).not.toBe(true);
	});

	/**
	 * The reason the guard reads Firebase and not the store: on a page reload
	 * the session is restored asynchronously, and answering early would turn
	 * away the very collector whose page it is.
	 */
	it('answers nothing while the session is still being restored', () => {
		expect(run()).toEqual([]);
		expect(router.createUrlTree).not.toHaveBeenCalled();
	});
});
