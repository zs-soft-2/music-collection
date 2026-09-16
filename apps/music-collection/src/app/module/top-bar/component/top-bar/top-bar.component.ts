import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { TopBarParams } from '../../api';
import { TopBarService } from './top-bar.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [TopBarService],
	selector: 'mc-top-bar',
  standalone: false,
	styleUrls: ['./top-bar.component.scss'],
	templateUrl: './top-bar.component.html',
})
export class TopBarComponent extends BaseComponent implements OnInit {
	private componentService = inject(TopBarService);

	public params$!: Observable<TopBarParams>;

	public imgClickHandler(): void {
		this.componentService.imgClickHandler();
	}

	public loginClickHandler(): void {
		this.componentService.login();
	}

	public logoutHandler(): void {
		this.componentService.logout();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService
			.init$();
	}
}
