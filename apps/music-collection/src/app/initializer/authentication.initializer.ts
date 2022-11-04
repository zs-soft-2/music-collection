import { AuthenticationStateService } from '@music-collection/api';
import { first, tap } from 'rxjs';

export function AuthenticationInitializer(
	authenticationStateService: AuthenticationStateService
) {
	return () => {
		return new Promise<any>((resolve, reject) => {
			authenticationStateService
				.selectAuthenticatedUser$()
				.pipe(
					first(),
					tap((authenticatedUser) => {
						if (authenticatedUser.uid) {
							authenticationStateService.dispatchLogin();
						}
					})
				)
				.subscribe(() => {
					resolve(true);
				});
		});
	};
}
