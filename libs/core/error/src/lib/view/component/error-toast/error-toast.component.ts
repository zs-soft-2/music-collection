import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ErrorStateService } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule],
	selector: 'mc-error-toast',
	styleUrls: ['./error-toast.component.scss'],
	templateUrl: './error-toast.component.html',
})
export class ErrorToastComponent {
	private errorStateService = inject(ErrorStateService);

	protected errors = toSignal(this.errorStateService.selectErrors$(), {
		initialValue: [],
	});

	protected dismiss(uid: string): void {
		this.errorStateService.dispatchDismiss(uid);
	}
}
