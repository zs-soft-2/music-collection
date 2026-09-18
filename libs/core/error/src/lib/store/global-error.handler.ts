import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { ErrorStateService } from '@music-collection/api';

/**
 * Az Angular által elkapott hibák (sablon, effect, életciklus) és a kezeletlen
 * promise-elutasítások egy helyre futnak be: a store-ba és a konzolba. Semmit
 * nem nyelünk el.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
	// Az ErrorHandler az injektor felépülése előtt jön létre, ezért a
	// szolgáltatást csak a hiba pillanatában kérjük el.
	private injector = inject(Injector);

	constructor() {
		globalThis.addEventListener?.('unhandledrejection', (event) =>
			this.report(event.reason, 'unhandledrejection')
		);
	}

	public handleError(error: unknown): void {
		this.report(error, 'ErrorHandler');
	}

	private report(error: unknown, source: string): void {
		const cause = (error as { rejection?: unknown })?.rejection ?? error;

		console.error(`[${source}]`, cause);

		this.injector.get(ErrorStateService).dispatchReport({
			message: messageOf(cause),
			source,
			detail: cause instanceof Error ? cause.stack : undefined,
		});
	}
}

function messageOf(error: unknown): string {
	if (typeof error === 'string' && error) return error;
	if (error instanceof Error) return error.message;

	const { message, code } = (error ?? {}) as {
		message?: string;
		code?: string;
	};

	return message || code || 'Ismeretlen hiba';
}
