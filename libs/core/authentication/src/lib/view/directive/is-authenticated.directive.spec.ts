import { of } from 'rxjs';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthenticationStateService } from '@music-collection/api';

import { IsAuthenticatedDirective } from './is-authenticated.directive';

@Component({
	imports: [IsAuthenticatedDirective],
	template: '<span *mcIsAuthenticated="true">authenticated</span>',
})
class TestHostComponent {}

describe('IsAuthenticatedDirective', () => {
	it('should create an instance', async () => {
		await TestBed.configureTestingModule({
			imports: [TestHostComponent],
			providers: [
				{
					provide: AuthenticationStateService,
					useValue: { selectIsAuthenticated$: () => of(true) },
				},
			],
		}).compileComponents();

		const fixture = TestBed.createComponent(TestHostComponent);

		fixture.detectChanges();

		const directive = fixture.debugElement
			.queryAllNodes(By.directive(IsAuthenticatedDirective))[0]
			?.injector.get(IsAuthenticatedDirective);

		expect(directive).toBeTruthy();
	});
});
