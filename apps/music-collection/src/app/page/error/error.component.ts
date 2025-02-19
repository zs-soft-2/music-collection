import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-error',
	templateUrl: './error.component.html',
	styleUrls: ['./error.component.scss'],
  standalone: false,
})
export class ErrorComponent {}
