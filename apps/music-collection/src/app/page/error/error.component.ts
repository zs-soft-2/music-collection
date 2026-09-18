import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-error',
	templateUrl: './error.component.html',
	styleUrls: ['./error.component.scss'],
	imports: [RouterLink],
})
export class ErrorComponent {}
