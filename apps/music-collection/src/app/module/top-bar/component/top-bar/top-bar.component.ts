import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { TopBarParams } from '../../api';
import { TopBarService } from './top-bar.service';
import { Bind } from 'primeng/bind';
import { Menubar } from 'primeng/menubar';
import { SvgIconComponent } from 'angular-svg-icon';
import { CoreAuthenticationViewModule } from '@music-collection/core/authentication/view';
import { UserProfileModule } from '@music-collection/domain/user';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [TopBarService],
	selector: 'mc-top-bar',
	styleUrls: ['./top-bar.component.scss'],
	templateUrl: './top-bar.component.html',
	imports: [
		Bind,
		Menubar,
		SvgIconComponent,
		CoreAuthenticationViewModule,
		UserProfileModule,
		AsyncPipe,
	],
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
		this.params$ = this.componentService.init$();
	}
}
