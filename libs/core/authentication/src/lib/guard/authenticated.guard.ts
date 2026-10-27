import { map, take } from 'rxjs/operators';

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticatedUserService } from '@music-collection/api';

/**
 * Keeps a guest out of the pages that are about them: their collection,
 * their wishlist, the shelf they scan onto, where the collectors are. The
 * links to these are already gone from the top bar for a guest; this is for
 * the address typed in, the bookmark, the link shared with someone who is
 * not signed in.
 *
 * The session is asked of `AuthenticatedUserService`, not of the store: the
 * store holds a guest from the first moment, so on a page reload it would
 * turn away the very collector whose session Firebase is still restoring.
 * `user$` says nothing until it is settled, and `take(1)` waits for that —
 * the route activates late rather than wrongly.
 */
export const authenticatedGuard: CanActivateFn = () => {
	const router = inject(Router);

	return inject(AuthenticatedUserService).user$.pipe(
		take(1),
		map((user) => !!user || router.createUrlTree(['/home']))
	);
};
