import { MenuItem } from 'primeng/api';

import {
	ChangeDetectionStrategy,
	Component,
	Input,
	OnInit,
} from '@angular/core';
import { BaseComponent, User } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-user-profile',
	templateUrl: './user-profile.component.html',
	styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent extends BaseComponent implements OnInit {
	@Input()
	public user!: User;
	public userMenuItems!: MenuItem[];

	public ngOnInit(): void {
		this.userMenuItems = [
			{
				label: 'Admin',
				routerLink: 'admin',
			},
		];
	}
}
