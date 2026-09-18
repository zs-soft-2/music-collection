interface Bar {
	level: number;
	target: number;
	/** Bass bars move slower and higher, treble bars faster and lower. */
	weight: number;
	/** Analyser bins the bar covers, [from, to). */
	from: number;
	to: number;
}

/** Pulse of the simulation (no analyser), in beats per minute. */
const PULSE_BPM = 120;
/** Highest frequency shown, in Hz. */
const TOP_HZ = 16000;
const BOTTOM_HZ = 40;
/** Bass band for beat detection, in Hz. */
const BASS_HZ = 150;
/** A bass hit: this much above the recent average. */
const BEAT_RATIO = 1.35;
/** No two beats closer than this, in seconds. */
const BEAT_GAP = 0.18;

/**
 * A spectrum bar visualiser over a canvas. With an analyser (the tab's
 * sound) the bars show the real frequencies on a log scale and `onBeat`
 * fires on bass hits; without one they dance to a steady simulated pulse,
 * jumping on `kick()`. They settle while paused.
 */
export class EqualizerBars {
	/** Called on every detected bass hit (analyser only). */
	public onBeat: ((strength: number) => void) | null = null;

	private readonly context: CanvasRenderingContext2D;
	private readonly bars: Bar[];
	private analyser: AnalyserNode | null = null;
	private spectrum = new Uint8Array(0);
	private bassBins = 1;
	private bassAverage = 0;
	private sinceBeat = 0;
	private frame = 0;
	private last = 0;
	private beat = 0;
	private energy = 0;
	private running = false;
	private width = 0;
	private height = 0;

	public constructor(
		private readonly canvas: HTMLCanvasElement,
		count: number
	) {
		this.context = canvas.getContext('2d')!;
		this.bars = Array.from({ length: count }, (_, i) => {
			const position = i / Math.max(1, count - 1);
			// Loudest a little right of the bass end, like most music.
			const weight =
				0.35 + 0.65 * Math.exp(-((position - 0.18) ** 2) / 0.12);
			return { level: 0, target: 0, weight, from: 0, to: 0 };
		});
		this.resize();
	}

	/** Follows the real sound; null goes back to the simulation. */
	public setAnalyser(analyser: AnalyserNode | null): void {
		this.analyser = analyser;
		if (!analyser) {
			return;
		}
		const bins = analyser.frequencyBinCount;
		const binHz = analyser.context.sampleRate / analyser.fftSize;
		this.spectrum = new Uint8Array(bins);
		this.bassBins = Math.max(1, Math.round(BASS_HZ / binHz));
		this.bassAverage = 0;

		// Log-spaced bands, each at least one bin wide.
		const count = this.bars.length;
		let from = Math.max(1, Math.floor(BOTTOM_HZ / binHz));
		this.bars.forEach((bar, i) => {
			const hz = BOTTOM_HZ * (TOP_HZ / BOTTOM_HZ) ** ((i + 1) / count);
			const to = Math.min(
				bins,
				Math.max(from + 1, Math.round(hz / binHz))
			);
			bar.from = from;
			bar.to = to;
			from = to;
		});
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

	public setRunning(running: boolean): void {
		this.running = running;
	}

	public kick(amount = 1): void {
		this.energy = Math.min(1.5, this.energy + amount);
	}

	public resize(): void {
		const ratio = Math.min(2, window.devicePixelRatio || 1);
		this.width = this.canvas.clientWidth;
		this.height = this.canvas.clientHeight;
		this.canvas.width = this.width * ratio;
		this.canvas.height = this.height * ratio;
		this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
	}

	private step(seconds: number): void {
		if (this.analyser) {
			this.measure(seconds);
		} else {
			this.simulate(seconds);
		}
		for (const bar of this.bars) {
			// Quick attack, slower fall, like a real meter.
			const speed = bar.target > bar.level ? 24 : 7;
			bar.level +=
				(bar.target - bar.level) * Math.min(1, seconds * speed);
		}
		this.draw();
	}

	/** The real spectrum, and bass hits. */
	private measure(seconds: number): void {
		const analyser = this.analyser!;
		analyser.getByteFrequencyData(this.spectrum);

		for (const bar of this.bars) {
			let peak = 0;
			for (let bin = bar.from; bin < bar.to; bin++) {
				peak = Math.max(peak, this.spectrum[bin]);
			}
			// Treble is quieter by nature: lift it a little.
			const tilt = 1 + (1 - bar.weight) * 0.35;
			bar.target = Math.min(1, ((peak / 255) * tilt) ** 1.6);
		}

		let bass = 0;
		for (let bin = 1; bin <= this.bassBins; bin++) {
			bass += this.spectrum[bin];
		}
		bass /= this.bassBins * 255;
		this.sinceBeat += seconds;
		if (
			bass > 0.25 &&
			bass > this.bassAverage * BEAT_RATIO &&
			this.sinceBeat > BEAT_GAP
		) {
			this.sinceBeat = 0;
			this.onBeat?.(Math.min(1, (bass - this.bassAverage) * 3));
		}
		this.bassAverage +=
			(bass - this.bassAverage) * Math.min(1, seconds * 3);
	}

	/** A steady pulse with random movement, kicked from outside. */
	private simulate(seconds: number): void {
		this.energy = Math.max(0, this.energy - seconds * 1.5);
		const beatLength = 60 / PULSE_BPM;
		const previousBeat = this.beat;
		this.beat = (this.beat + seconds / beatLength) % 1;
		const onBeat = this.beat < previousBeat;

		for (const bar of this.bars) {
			if (!this.running) {
				bar.target = 0.03;
				continue;
			}
			// New targets now and then, and on every beat for the bass.
			if (
				onBeat ||
				Math.random() < seconds * (4 + (1 - bar.weight) * 10)
			) {
				const pulse = onBeat ? bar.weight * 0.5 : 0;
				bar.target = Math.min(
					1,
					(0.15 + Math.random() * 0.6) * bar.weight +
						pulse +
						this.energy * 0.35 * Math.random()
				);
			}
		}
	}

	private draw(): void {
		const { context, width, height, bars } = this;
		context.clearRect(0, 0, width, height);

		const gap = Math.max(2, width / bars.length / 5);
		const barWidth = width / bars.length - gap;
		const gradient = context.createLinearGradient(0, height, 0, 0);
		gradient.addColorStop(0, 'rgb(255 40 20 / 0.95)');
		gradient.addColorStop(0.55, 'rgb(255 120 30 / 0.9)');
		gradient.addColorStop(1, 'rgb(255 210 90 / 0.95)');
		context.fillStyle = gradient;
		context.shadowColor = 'rgb(255 80 30 / 0.6)';
		context.shadowBlur = 12;

		bars.forEach((bar, i) => {
			const barHeight = Math.max(2, bar.level * height);
			const x = i * (barWidth + gap) + gap / 2;
			const radius = Math.min(3, barWidth / 2);
			context.beginPath();
			context.roundRect(x, height - barHeight, barWidth, barHeight, [
				radius,
				radius,
				0,
				0,
			]);
			context.fill();
		});
		context.shadowBlur = 0;
	}
}
