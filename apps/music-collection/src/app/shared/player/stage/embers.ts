interface Ember {
	x: number;
	y: number;
	radius: number;
	speed: number;
	drift: number;
	phase: number;
	life: number;
	hue: number;
}

/**
 * Glowing embers rising over a canvas. `boost()` stirs them up for a moment
 * (e.g. on a new lyric line); `setRunning(false)` lets them settle.
 */
export class EmberField {
	private readonly context: CanvasRenderingContext2D;
	private readonly embers: Ember[] = [];
	private frame = 0;
	private last = 0;
	private energy = 0;
	private running = true;
	private width = 0;
	private height = 0;

	public constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly count = 90
	) {
		this.context = canvas.getContext('2d')!;
		this.resize();
		for (let i = 0; i < count; i++) {
			this.embers.push(this.spawn(true));
		}
	}

	public start(): void {
		this.last = performance.now();
		const tick = (now: number) => {
			this.step(Math.min(0.05, (now - this.last) / 1000));
			this.last = now;
			this.frame = requestAnimationFrame(tick);
		};
		this.frame = requestAnimationFrame(tick);
	}

	public stop(): void {
		cancelAnimationFrame(this.frame);
	}

	public boost(amount = 1): void {
		this.energy = Math.min(2, this.energy + amount);
	}

	public setRunning(running: boolean): void {
		this.running = running;
	}

	public resize(): void {
		const ratio = Math.min(2, window.devicePixelRatio || 1);
		this.width = this.canvas.clientWidth;
		this.height = this.canvas.clientHeight;
		this.canvas.width = this.width * ratio;
		this.canvas.height = this.height * ratio;
		this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
	}

	private spawn(anywhere = false): Ember {
		return {
			x: Math.random() * this.width,
			y: anywhere
				? Math.random() * this.height
				: this.height + 10 + Math.random() * 40,
			radius: 0.6 + Math.random() * 2.2,
			speed: 18 + Math.random() * 50,
			drift: (Math.random() - 0.5) * 30,
			phase: Math.random() * Math.PI * 2,
			life: 0.4 + Math.random() * 0.6,
			// Red to amber.
			hue: 5 + Math.random() * 35,
		};
	}

	private step(seconds: number): void {
		this.energy = Math.max(0, this.energy - seconds * 1.2);
		const pace = (this.running ? 1 : 0.25) * (1 + this.energy * 2.5);
		const { context } = this;

		context.clearRect(0, 0, this.width, this.height);
		context.globalCompositeOperation = 'lighter';

		for (let i = 0; i < this.embers.length; i++) {
			const ember = this.embers[i];
			ember.phase += seconds * 2;
			ember.y -= ember.speed * pace * seconds;
			ember.x +=
				(ember.drift + Math.sin(ember.phase) * 12) * pace * seconds;

			if (ember.y < -20 || ember.x < -20 || ember.x > this.width + 20) {
				this.embers[i] = this.spawn();
				continue;
			}
			// Fade out towards the top.
			const height = ember.y / this.height;
			const flicker = 0.75 + Math.sin(ember.phase * 3) * 0.25;
			const alpha =
				Math.max(0, Math.min(1, height * 1.4)) *
				ember.life *
				flicker *
				(0.55 + this.energy * 0.3);
			const glow = ember.radius * (4 + this.energy * 2);

			const gradient = context.createRadialGradient(
				ember.x,
				ember.y,
				0,
				ember.x,
				ember.y,
				glow
			);
			gradient.addColorStop(
				0,
				`hsla(${ember.hue + 20}, 100%, 70%, ${alpha})`
			);
			gradient.addColorStop(
				0.3,
				`hsla(${ember.hue}, 100%, 50%, ${alpha * 0.5})`
			);
			gradient.addColorStop(1, `hsla(${ember.hue}, 100%, 40%, 0)`);
			context.fillStyle = gradient;
			context.beginPath();
			context.arc(ember.x, ember.y, glow, 0, Math.PI * 2);
			context.fill();
		}
		context.globalCompositeOperation = 'source-over';
	}
}
