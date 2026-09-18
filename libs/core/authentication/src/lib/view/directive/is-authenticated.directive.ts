import { takeUntil } from 'rxjs/operators';

import {
	Directive,
	Input,
	OnInit,
	TemplateRef,
	ViewContainerRef,
	inject,
} from '@angular/core';
import {
	AuthenticationStateService,
	BaseDirective,
} from '@music-collection/api';

@Directive({ selector: '[mcIsAuthenticated]' })
export class IsAuthenticatedDirective extends BaseDirective implements OnInit {
	private authenticationStateService = inject(AuthenticationStateService);
	private templateRef = inject<TemplateRef<unknown>>(TemplateRef);
	private viewContainer = inject(ViewContainerRef);

	public condition = false;

	@Input()
	public set mcIsAuthenticated(condition: boolean) {
		this.condition = condition;
	}

	public ngOnInit() {
		this.authenticationStateService
			.selectIsAuthenticated$()
			.pipe(takeUntil(this.destroy))
			.subscribe((isAuthenticated) => {
				if (
					(isAuthenticated && this.condition) ||
					(!isAuthenticated && !this.condition)
				) {
					this.viewContainer.createEmbeddedView(this.templateRef);
				} else {
					this.viewContainer.clear();
				}
			});
	}
}
