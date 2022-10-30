import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BaseComponent, User } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-user-profile',
	templateUrl: './user-profile.component.html',
	styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent extends BaseComponent {
	@Input()
	public user!: User;
}
