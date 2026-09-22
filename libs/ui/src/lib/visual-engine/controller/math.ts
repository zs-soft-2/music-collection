export function clamp(value: number, min: number, max: number): number {
	return value < min ? min : value > max ? max : value;
}

export function clamp01(value: number): number {
	return clamp(value, 0, 1);
}

export function lerp(from: number, to: number, amount: number): number {
	return from + (to - from) * clamp01(amount);
}

/**
 * Moves `current` a fraction of the way to `target` every frame, but framed in
 * seconds so the result does not change with the frame rate. This is what
 * keeps the scene breathing instead of flickering.
 */
export function approach(
	current: number,
	target: number,
	seconds: number,
	halfLife: number
): number {
	if (halfLife <= 0) {
		return target;
	}
	const amount = 1 - Math.pow(0.5, seconds / halfLife);
	return current + (target - current) * amount;
}

/** Cheap deterministic noise, good enough to jitter a light or a camera. */
export function hash(value: number): number {
	const x = Math.sin(value * 127.1) * 43758.5453;
	return x - Math.floor(x);
}

/** Smooth 1D value noise in 0..1. */
export function noise(value: number): number {
	const i = Math.floor(value);
	const f = value - i;
	const u = f * f * (3 - 2 * f);
	return lerp(hash(i), hash(i + 1), u);
}
