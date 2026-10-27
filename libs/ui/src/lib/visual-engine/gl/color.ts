export type Rgb = [number, number, number];

/** `#rgb` or `#rrggbb` to 0..1 components. Unparsable input renders black. */
export function hexToRgb(hex: string): Rgb {
	const value = hex.trim().replace('#', '');
	const full =
		value.length === 3
			? value
					.split('')
					.map((c) => c + c)
					.join('')
			: value;

	if (full.length !== 6) {
		return [0, 0, 0];
	}
	const number = Number.parseInt(full, 16);
	if (Number.isNaN(number)) {
		return [0, 0, 0];
	}
	return [
		((number >> 16) & 255) / 255,
		((number >> 8) & 255) / 255,
		(number & 255) / 255,
	];
}

export function scaleRgb(colour: Rgb, factor: number): Rgb {
	return [colour[0] * factor, colour[1] * factor, colour[2] * factor];
}

export function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
	return [
		from[0] + (to[0] - from[0]) * amount,
		from[1] + (to[1] - from[1]) * amount,
		from[2] + (to[2] - from[2]) * amount,
	];
}
