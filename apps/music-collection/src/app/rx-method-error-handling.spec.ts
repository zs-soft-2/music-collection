import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Egy szabály, amit egyetlen store tesztje sem tud megőrizni.
 *
 * A `tapResponse` a hibát `catchError`-ral fogja meg, és `EMPTY`-vel zárja a
 * forrását. Ha a külső `rxMethod(pipe(...))` utolsó operátora, akkor az
 * *rxMethod saját* forrása zárul le: az első elhasalt hívás után a metódus
 * további hívásai nem indítanak semmit, lapújratöltésig. A tünet néma — az
 * `isLoading` flag szépen visszaáll, a gomb aktív marad, csak nem történik
 * semmi —, ezért egy képmodell 500-asa úgy látszott, mintha a modellváltás
 * nem fogna rajta.
 *
 * A `tapResponse` helye a forrás `.pipe()`-jában van, a `switchMap`/
 * `exhaustMap` belsejében: ott ugyanaz az operátor csak azt az egy kérést
 * temeti el, és a metódus él tovább.
 *
 * Ez a teszt azért olvas forrást, mert a szabály 41 store-ra szól, és a
 * következőre is. Egy viselkedési teszt egy store-t véd; ez a minta egészét.
 * Ugyanaz a fogás, amivel a `tours.script.spec.ts` olvassa a szótárakat.
 */

/** A workspace gyökere: innen az `apps` és a `libs` is elérhető. */
const ROOT = join(__dirname, '../../../..');

/** Ahol signalStore élhet. A `functions` nem rxjs-szel dolgozik. */
const ROOTS = ['apps/music-collection/src', 'libs'];

/** Ami mögött forrás-observable áll, tehát hibát hozhat a pipe-ba. */
const FLATTENERS = [
	'switchMap(',
	'exhaustMap(',
	'concatMap(',
	'mergeMap(',
	'switchScan(',
];

interface Finding {
	file: string;
	line: number;
}

function sources(directory: string): string[] {
	const entries = readdirSync(join(ROOT, directory), { withFileTypes: true });

	return entries.flatMap((entry) => {
		const path = `${directory}/${entry.name}`;

		if (entry.isDirectory()) {
			return entry.name === 'node_modules' ? [] : sources(path);
		}

		return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
			? [path]
			: [];
	});
}

function indent(line: string): number {
	return line.length - line.replace(/^\t+/, '').length;
}

/**
 * Egy `tapResponse`, ami egy *operátor*-pipe utolsó lépése.
 *
 * A megkülönböztetés azon áll, mihez tartozik az őt tartó `pipe(`. Egy
 * forráson hívott `valami$.pipe(` saját folyam: ott a `tapResponse` csak azt
 * az egyet zárja le. A csupasz `pipe(` viszont operátorokat fűz egybe, és azt
 * ebben a kódbázisban az `rxMethod` kapja meg — ott a lezárás magát a
 * metódust némítja el.
 *
 * Flattener nélkül nincs mit elnémítani: olyankor a pipe-ba csak az rxMethod
 * saját kibocsátása érkezik, és az nem hibázik.
 */
function scan(file: string, source: string): Finding[] {
	const lines = source.split('\n');
	const found: Finding[] = [];

	lines.forEach((line, index) => {
		if (!line.trim().startsWith('tapResponse(')) {
			return;
		}

		const depth = indent(line);
		let owner = -1;

		for (let before = index - 1; before >= 0; before -= 1) {
			if (indent(lines[before]) < depth - 1) {
				break;
			}

			if (
				indent(lines[before]) === depth - 1 &&
				lines[before].trimEnd().endsWith('pipe(')
			) {
				owner = before;
				break;
			}
		}

		const holder = owner < 0 ? '' : lines[owner].trim();

		if (holder !== 'pipe(' && holder !== 'return pipe(') {
			return;
		}

		const flattened = lines
			.slice(owner + 1, index)
			.some(
				(above) =>
					indent(above) === depth &&
					FLATTENERS.some((flattener) =>
						above.trimStart().startsWith(flattener)
					)
			);

		if (flattened) {
			found.push({ file, line: index + 1 });
		}
	});

	return found;
}

function offenders(file: string): Finding[] {
	return scan(file, readFileSync(join(ROOT, file), 'utf8'));
}

describe('tapResponse az rxMethod pipe-jában', () => {
	it('egyetlen store sem zárja le a saját rxMethodját egy hibával', () => {
		const findings = ROOTS.flatMap((directory) =>
			sources(directory).flatMap(offenders)
		);

		expect(
			findings.map(({ file, line }) => `${file}:${line}`)
		).toStrictEqual([]);
	});

	/**
	 * A kereső maga is elromolhat, és egy üres lista ugyanúgy néz ki, ha
	 * nincs mit találni, és ha nem keres. Ezért kap egy ismert rosszat és egy
	 * ismert jót.
	 */
	it('a kereső megtalálja a rossz mintát', () => {
		const broken = [
			'const load = rxMethod<void>(',
			'\tpipe(',
			'\t\tswitchMap(() => effect.list$()),',
			'\t\ttapResponse({',
			'\t\t\tnext: () => undefined,',
			'\t\t\terror: () => undefined,',
			'\t\t})',
			'\t)',
			');',
		].join('\n');

		expect(scan('példa.ts', broken)).toStrictEqual([
			{ file: 'példa.ts', line: 4 },
		]);
	});

	it('a forráson hívott pipe-ot nem kifogásolja', () => {
		const sound = [
			'const load = rxMethod<void>(',
			'\tpipe(',
			'\t\tswitchMap(() =>',
			'\t\t\teffect.list$().pipe(',
			'\t\t\t\ttapResponse({',
			'\t\t\t\t\tnext: () => undefined,',
			'\t\t\t\t\terror: () => undefined,',
			'\t\t\t\t})',
			'\t\t\t)',
			'\t\t)',
			'\t)',
			');',
		].join('\n');

		expect(scan('példa.ts', sound)).toStrictEqual([]);
	});
});
