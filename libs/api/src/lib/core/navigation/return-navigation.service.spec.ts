import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { ReturnNavigationService } from './return-navigation.service';

describe('ReturnNavigationService', () => {
	let router: Router;
	let service: ReturnNavigationService;

	const openAt = (url: string) =>
		Object.defineProperty(router, 'url', {
			value: url,
			configurable: true,
		});

	beforeEach(() => {
		TestBed.configureTestingModule({});
		router = TestBed.inject(Router);
		service = TestBed.inject(ReturnNavigationService);
	});

	it('reads an in-app return URL', () => {
		openAt('/admin/album/edit/1?returnUrl=%2Falbum%2F1');

		expect(service.returnUrl()).toBe('/album/1');
	});

	it.each([
		'https://example.com',
		'//example.com',
		'/admin/album/list',
		'album/1',
	])('rejects %s', (target) => {
		openAt(`/admin/album/edit/1?returnUrl=${encodeURIComponent(target)}`);

		expect(service.returnUrl()).toBeNull();
	});

	it('returns to the calling page', () => {
		openAt('/admin/album/edit/1?returnUrl=%2Falbum%2F1');
		const navigateByUrl = jest
			.spyOn(router, 'navigateByUrl')
			.mockResolvedValue(true);

		service.leave(['../../list'], {} as ActivatedRoute);

		expect(navigateByUrl).toHaveBeenCalledWith('/album/1');
	});

	it('falls back to the given route', () => {
		openAt('/admin/album/edit/1');
		const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
		const route = {} as ActivatedRoute;

		service.leave(['../../list'], route);

		expect(navigate).toHaveBeenCalledWith(['../../list'], {
			relativeTo: route,
		});
	});
});
