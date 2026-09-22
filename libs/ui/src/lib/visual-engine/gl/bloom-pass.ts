import {
	BLUR_FRAGMENT,
	BRIGHT_PASS_FRAGMENT,
	COMPOSITE_FRAGMENT,
	FULLSCREEN_VERTEX,
} from '../shader';
import { GlProgram } from './gl-program';
import { RenderTarget } from './render-target';
import { ScreenQuad } from './screen-quad';

/** The blur runs at a quarter of the scene's resolution in each direction. */
const DOWNSCALE = 4;

/**
 * Bright pass, separable blur, composite. This is what turns the furnace
 * glow and the embers from bright pixels into light that spills into the fog.
 */
export class BloomPass {
	private readonly bright: RenderTarget;
	private readonly blurA: RenderTarget;
	private readonly blurB: RenderTarget;

	private readonly brightProgram: GlProgram;
	private readonly blurProgram: GlProgram;
	private readonly compositeProgram: GlProgram;

	public constructor(
		private readonly gl: WebGL2RenderingContext,
		private readonly quad: ScreenQuad
	) {
		this.bright = new RenderTarget(gl);
		this.blurA = new RenderTarget(gl);
		this.blurB = new RenderTarget(gl);

		this.brightProgram = new GlProgram(
			gl,
			FULLSCREEN_VERTEX,
			BRIGHT_PASS_FRAGMENT,
			'bright pass'
		);
		this.blurProgram = new GlProgram(
			gl,
			FULLSCREEN_VERTEX,
			BLUR_FRAGMENT,
			'blur'
		);
		this.compositeProgram = new GlProgram(
			gl,
			FULLSCREEN_VERTEX,
			COMPOSITE_FRAGMENT,
			'composite'
		);
	}

	public resize(width: number, height: number): void {
		const w = Math.max(1, Math.floor(width / DOWNSCALE));
		const h = Math.max(1, Math.floor(height / DOWNSCALE));
		this.bright.resize(w, h);
		this.blurA.resize(w, h);
		this.blurB.resize(w, h);
	}

	/** Draws the lit scene plus its own glow into the canvas. */
	public render(
		scene: WebGLTexture,
		amount: number,
		width: number,
		height: number
	): void {
		const { gl } = this;
		gl.disable(gl.BLEND);

		this.bright.bind();
		this.brightProgram.use();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, scene);
		this.brightProgram.int('uSource', 0);
		this.brightProgram.float('uThreshold', 0.55);
		this.quad.draw();

		this.blurProgram.use();
		this.blurProgram.int('uSource', 0);

		this.blurA.bind();
		gl.bindTexture(gl.TEXTURE_2D, this.bright.texture);
		this.blurProgram.vec2('uDirection', 1 / this.blurA.width, 0);
		this.quad.draw();

		this.blurB.bind();
		gl.bindTexture(gl.TEXTURE_2D, this.blurA.texture);
		this.blurProgram.vec2('uDirection', 0, 1 / this.blurB.height);
		this.quad.draw();

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, width, height);
		this.compositeProgram.use();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, scene);
		this.compositeProgram.int('uScene', 0);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.blurB.texture);
		this.compositeProgram.int('uBloom', 1);
		this.compositeProgram.float('uAmount', amount);
		this.quad.draw();
		gl.activeTexture(gl.TEXTURE0);
	}

	public dispose(): void {
		this.bright.dispose();
		this.blurA.dispose();
		this.blurB.dispose();
		this.brightProgram.dispose();
		this.blurProgram.dispose();
		this.compositeProgram.dispose();
	}
}
