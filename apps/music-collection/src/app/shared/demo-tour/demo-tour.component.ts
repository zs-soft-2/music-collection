import {
	AutopilotControlsComponent,
	AutopilotOverlayComponent,
	AutopilotTooltipComponent,
} from '@zssz-soft/demo-autopilot-core';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DemoTourService } from '../../data/demo-tour';

/**
 * The guided tour's own furniture: the spotlight that dims everything but the
 * one thing being talked about, the tooltip that talks, and the launcher the
 * collector starts it from.
 *
 * The shell only puts this on the page for a collector who has the tour
 * switched on, and only then is the walkthrough itself fetched — nothing here
 * is in the first bundle.
 *
 * The library draws itself from `--zs-*` custom properties, which is the whole
 * reason it fits in: they are set here from the app's own tokens, so the
 * tooltip follows the theme the collector picked rather than shipping a second
 * palette of its own.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-demo-tour',
	imports: [
		AutopilotOverlayComponent,
		AutopilotTooltipComponent,
		AutopilotControlsComponent,
	],
	template: `
		<zs-autopilot-overlay />
		<zs-autopilot-tooltip />
		<zs-autopilot-controls />
	`,
	styles: `
		:host {
			/* Three fixed layers; the host itself must take up no room. */
			display: contents;

			--zs-color-bg-elevated: var(--mc-card-bg);
			--zs-color-bg-muted: var(--mc-card-bg-hover);
			--zs-color-border: var(--mc-border);
			--zs-color-text: var(--mc-text);
			--zs-color-text-muted: var(--mc-text-muted);
			--zs-color-primary: var(--mc-primary);
			--zs-color-danger: var(--mc-status-bad);

			/* The same tokens under the names the older components use. */
			--zs-surface: var(--mc-card-bg);
			--zs-surface-hover: var(--mc-card-bg-hover);
			--zs-border: var(--mc-border);
			--zs-text: var(--mc-text);
			--zs-text-secondary: var(--mc-text-muted);
			--zs-primary: var(--mc-primary);
			--zs-error: var(--mc-status-bad);

			--zs-radius-sm: var(--mc-radius-sm);
			--zs-radius-md: var(--mc-radius-md);
			--zs-radius-lg: var(--mc-radius-lg);

			/*
			 * Darker than the library's default: this app is dark by
			 * default, and a 50% veil over near-black barely reads as one.
			 */
			--zs-autopilot-overlay-bg: rgb(0 0 0 / 68%);
		}
	`,
})
export class DemoTourComponent {
	public constructor() {
		// Fetches the walkthrough and hands it to the autopilot, which is what
		// puts it in the launcher's menu.
		inject(DemoTourService).prepare();
	}
}
