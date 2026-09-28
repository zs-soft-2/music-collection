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
			 * Much darker than the library's default: this app is dark by
			 * default, and a 50% veil over near-black is not a veil at all.
			 * Everything the tour is not talking about has to fall away.
			 */
			--zs-autopilot-overlay-bg: rgb(0 0 0 / 84%);

			/*
			 * The tour's own furniture — the tooltip, the launcher's menu, the
			 * playback bar — is laid over the page rather than being part of
			 * it, and has to read that way: a visible edge and a shadow deep
			 * enough to stand on a page that has been dimmed away.
			 */
			--zs-preset-surface-bg: var(--mc-card-bg);
			--zs-preset-surface-border: var(--mc-border-strong);
			--zs-preset-surface-border-width: 1px;
			--zs-preset-surface-radius: var(--mc-radius-lg);
			--zs-preset-surface-shadow:
				0 1.5rem 3rem rgb(0 0 0 / 55%), 0 0 0 1px rgb(0 0 0 / 35%);
		}

		/*
		 * In the dark theme the app's own card colour is near-black, which is
		 * the one thing the veil behind it also is. There the panel has to be
		 * lifted rather than merely outlined.
		 */
		:host-context(html.mc-dark) {
			--zs-preset-surface-bg: color-mix(
				in srgb,
				var(--mc-card-bg) 82%,
				#fff 18%
			);
			--zs-preset-surface-shadow:
				0 1.5rem 3rem rgb(0 0 0 / 75%), 0 0 0 1px rgb(0 0 0 / 60%);
		}

		/*
		 * A ring around the cut-out, in the app's own accent. Without it the
		 * lit patch and the veil meet in a soft edge, and on a dark page it is
		 * not obvious that anything is being pointed at.
		 */
		zs-autopilot-overlay ::ng-deep .zs-autopilot-overlay__spotlight {
			outline: 2px solid
				color-mix(in srgb, var(--mc-primary) 60%, transparent);
			outline-offset: 0;
		}

		/*
		 * Above the bottom of the screen, which is taken: the consent bar
		 * runs the width of the page and the YouTube dock sits in the other
		 * corner. The library puts the launcher 1.5rem from the edge, which
		 * lands it on top of the bar.
		 */
		zs-autopilot-controls.position-bottom-left {
			bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px));
		}

		/*
		 * The menu of walkthroughs hangs off the right edge of the launcher,
		 * which is where it belongs in the corner the library was written for.
		 * Ours stands in the left corner, so from there it opened off the side
		 * of the screen: it has to hang off the left edge instead.
		 */
		zs-autopilot-controls.position-bottom-left
			::ng-deep
			.zs-autopilot-controls__menu {
			right: auto;
			left: 0;
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
