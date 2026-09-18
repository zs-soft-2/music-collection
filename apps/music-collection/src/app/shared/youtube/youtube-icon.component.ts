import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The YouTube logo mark: a red rounded rectangle with a white play triangle.
 * Decorative: the surrounding text names the action.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-youtube-icon',
	template: `
		<svg viewBox="0 0 28 20" aria-hidden="true" focusable="false">
			<path
				fill="#ff0033"
				d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9Z"
			/>
			<path fill="#fff" d="m11.2 14.3 7.2-4.3-7.2-4.3v8.6Z" />
		</svg>
	`,
	styles: `
		:host {
			display: inline-flex;
			width: 1.4em;
			height: 1em;
			flex-shrink: 0;
		}

		svg {
			width: 100%;
			height: 100%;
		}
	`,
})
export class YoutubeIconComponent {}
