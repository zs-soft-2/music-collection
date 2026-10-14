import {
	effectAt,
	holdMotion,
	SLIDE_EFFECTS,
	slideFrame,
	type SlideEffect,
} from './transitions';

describe('effectAt', () => {
	it('gives consecutive turns different crossings', () => {
		const first = effectAt(0);

		expect(effectAt(1)).not.toBe(first);
		expect(effectAt(2)).not.toBe(effectAt(1));
	});

	it('comes back round, and always to the same one', () => {
		expect(effectAt(SLIDE_EFFECTS.length)).toBe(effectAt(0));
		expect(effectAt(37)).toBe(effectAt(37));
	});

	it('settles on one for a turn it cannot count', () => {
		expect(effectAt(Number.NaN)).toBe(SLIDE_EFFECTS[0]);
	});
});

describe('slideFrame', () => {
	it('keeps the pictures waiting their turn out of sight', () => {
		for (const effect of SLIDE_EFFECTS) {
			expect(slideFrame('hidden', effect, 0.5).opacity).toBe(0);
		}
	});

	/*
	 * The last crossing of a round goes back to the first picture, which
	 * sits below every other in the DOM. Only the lift makes it visible.
	 */
	it('puts the arriving picture above the one it replaces', () => {
		for (const effect of SLIDE_EFFECTS) {
			expect(slideFrame('next', effect, 0.5).zIndex).toBeGreaterThan(
				slideFrame('current', effect, 0.5).zIndex
			);
		}
	});

	it('leaves the arriving picture covering the frame once it is over', () => {
		for (const effect of SLIDE_EFFECTS) {
			const frame = slideFrame('next', effect, 1);

			expect(frame.opacity).toBe(1);
			expect(frame.transform).toBe('translate(0%, 0%) scale(1)');
			expect(frame.filter).toBe('none');
			expect(frame.clipPath).toBe('none');
		}
	});

	it('shows nothing of it before the crossing starts', () => {
		const unseen = (effect: SlideEffect): boolean => {
			const { opacity, transform, clipPath, filter } = slideFrame(
				'next',
				effect,
				0
			);

			return (
				opacity === 0 ||
				clipPath === 'inset(0 0 0 100%)' ||
				transform.startsWith('translate(100%') ||
				// Far enough out of focus to read as the picture behind.
				filter === 'blur(9px)'
			);
		};

		for (const effect of SLIDE_EFFECTS) {
			expect(unseen(effect)).toBe(true);
		}
	});

	it('builds the crossing on top of the slow zoom, never instead of it', () => {
		expect(slideFrame('current', 'dissolve', 0, 1.04).transform).toBe(
			'translate(0%, 0%) scale(1.04)'
		);
		expect(slideFrame('current', 'zoom', 1, 1.04).transform).toBe(
			'translate(0%, 0%) scale(1.165)'
		);
	});

	it('wipes the next picture in from one edge', () => {
		expect(slideFrame('next', 'wipe', 0.5).clipPath).toBe(
			'inset(0 0 0 50%)'
		);
	});
});

describe('holdMotion', () => {
	it('pushes slowly into the picture over its turn', () => {
		expect(holdMotion(0, 1).zoom).toBeGreaterThan(holdMotion(0, 0).zoom);
	});

	/*
	 * A picture at the frame's own size has nothing outside it to move
	 * into, so panning one would show the stage behind its edge.
	 */
	it('starts in far enough that a moving picture keeps its edges out', () => {
		const { zoom, pan } = holdMotion(0, 0);

		expect(Math.abs(pan)).toBeLessThan(((zoom - 1) / 2) * 100);
	});

	it('sinks through one turn and rises through the next', () => {
		expect(holdMotion(4, 1).pan).toBeGreaterThan(holdMotion(4, 0).pan);
		expect(holdMotion(5, 1).pan).toBeLessThan(holdMotion(5, 0).pan);
	});

	it('hands the next picture on from where this one got to', () => {
		expect(holdMotion(5, 0).pan).toBe(holdMotion(4, 1).pan);
		expect(holdMotion(6, 0).pan).toBe(holdMotion(5, 1).pan);
	});

	it('leaves a turn it cannot count alone', () => {
		expect(holdMotion(Number.NaN, Number.NaN).pan).toBe(
			holdMotion(0, 0).pan
		);
	});
});

describe('the mosaic crossing', () => {
	/*
	 * The tiles of the picture coming apart are the mosaic's own, drawn
	 * above both layers; the layer they were cut from stands aside for it.
	 */
	it('hands the departing picture over to the mosaic', () => {
		expect(slideFrame('current', 'mosaic', 0.4).opacity).toBe(0);
		expect(slideFrame('next', 'mosaic', 0.4).opacity).toBe(1);
	});

	it('keeps the picture due next out of sight until the crossing', () => {
		expect(slideFrame('current', 'mosaic', 0).opacity).toBe(1);
		expect(slideFrame('next', 'mosaic', 0).opacity).toBe(0);
	});
});
