import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-error',
	templateUrl: './error.component.html',
	styleUrls: ['./error.component.scss'],
	imports: [...I18N_IMPORTS, RouterLink],
})
export class ErrorComponent {}
