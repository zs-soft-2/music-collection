import { Injector } from '@angular/core';
import { AppCheck } from '@angular/fire/app-check';
import { Firestore, doc, getDocFromServer } from '@angular/fire/firestore';
import { getToken } from 'firebase/app-check';

/**
 * A log on the phone itself, for when there is no cable and no Mac to open
 * the browser's inspector with. Opened by `?debug` on any address: it keeps
 * what the console says, what the page throws, and asks the two questions a
 * silent first screen comes down to — does App Check hand out a token, and
 * does Firestore answer with it.
 *
 * Plain DOM and nothing from the app: it has to work when the app does not.
 */
const LINES: string[] = [];
let panel: HTMLPreElement | null = null;
const startedAt = Date.now();

export function diagnosticsRequested(): boolean {
	try {
		return new URLSearchParams(location.search).has('debug');
	} catch {
		return false;
	}
}

function note(kind: string, text: string): void {
	const seconds = ((Date.now() - startedAt) / 1000).toFixed(1).padStart(5);

	LINES.push(`${seconds}s ${kind} ${text}`);

	if (panel) {
		panel.textContent = LINES.join('\n');
		panel.scrollTop = panel.scrollHeight;
	}
}

const describe = (value: unknown): string => {
	if (value instanceof Error) {
		const code = (value as { code?: string }).code;

		return `${code ? `[${code}] ` : ''}${value.message}`;
	}

	try {
		return typeof value === 'string' ? value : JSON.stringify(value);
	} catch {
		return String(value);
	}
};

export function installDiagnostics(): void {
	if (!diagnosticsRequested()) {
		return;
	}

	for (const level of ['error', 'warn'] as const) {
		const original = console[level].bind(console);

		console[level] = (...args: unknown[]) => {
			note(level, args.map(describe).join(' '));
			original(...args);
		};
	}

	addEventListener('error', (event) =>
		note('throw', `${event.message} (${event.filename}:${event.lineno})`)
	);
	addEventListener('unhandledrejection', (event) =>
		note('reject', describe(event.reason))
	);

	const connection = (
		navigator as { connection?: { effectiveType?: string } }
	).connection;

	note('env', navigator.userAgent);
	note(
		'env',
		`${location.host} online=${navigator.onLine} net=${connection?.effectiveType ?? '?'} ` +
			`storage=${'indexedDB' in self ? 'idb' : 'no-idb'}`
	);

	addEventListener('DOMContentLoaded', openPanel);
	if (document.readyState !== 'loading') {
		openPanel();
	}
}

function openPanel(): void {
	if (panel) {
		return;
	}

	const bar = document.createElement('div');

	bar.style.cssText =
		'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:#000d;' +
		'color:#9f9;font:11px/1.35 ui-monospace,Menlo,monospace;';

	const buttons = document.createElement('div');

	buttons.style.cssText = 'display:flex;gap:8px;padding:4px 8px;';

	const add = (label: string, run: () => void) => {
		const button = document.createElement('button');

		button.textContent = label;
		button.style.cssText = 'font:inherit;padding:4px 10px;';
		button.addEventListener('click', run);
		buttons.append(button);
	};

	panel = document.createElement('pre');
	panel.style.cssText =
		'margin:0;padding:4px 8px;max-height:42vh;overflow:auto;white-space:pre-wrap;word-break:break-all;';
	panel.textContent = LINES.join('\n');

	add('Copy', () =>
		navigator.clipboard
			?.writeText(LINES.join('\n'))
			.then(() => note('log', 'copied'))
			.catch((error) => note('log', `copy failed: ${describe(error)}`))
	);
	add('Hide', () => bar.remove());
	bar.append(buttons, panel);
	document.body.append(bar);
}

/**
 * What the first screen waits on, asked directly and timed. Run once the
 * app has an injector.
 */
export async function probeDiagnostics(injector: Injector): Promise<void> {
	if (!diagnosticsRequested()) {
		return;
	}

	const timed = async <T>(label: string, run: () => Promise<T>) => {
		const from = Date.now();

		try {
			const result = await run();

			note('probe', `${label} ok in ${Date.now() - from} ms`);
			return result;
		} catch (error) {
			note(
				'probe',
				`${label} FAILED after ${Date.now() - from} ms: ${describe(error)}`
			);
			return null;
		}
	};

	const appCheck = injector.get(AppCheck, null);

	if (appCheck) {
		await timed('App Check token', async () => {
			const { token } = await getToken(appCheck, false);

			return token.length;
		});
	} else {
		note('probe', 'App Check is not set up in this build');
	}

	await timed('Firestore sync/catalog from the server', () =>
		getDocFromServer(doc(injector.get(Firestore), 'sync/catalog'))
	);

	for (const entry of performance.getEntriesByType(
		'resource'
	) as PerformanceResourceTiming[]) {
		if (
			/recaptcha|firebaseappcheck|firestore\.googleapis/.test(entry.name)
		) {
			note(
				'net',
				`${Math.round(entry.duration)} ms ${entry.name.slice(0, 90)}`
			);
		}
	}
}
