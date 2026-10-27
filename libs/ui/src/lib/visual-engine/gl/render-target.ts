/** A colour-only framebuffer, used for the bright pass and the blur. */
export class RenderTarget {
	public readonly framebuffer: WebGLFramebuffer;
	public readonly texture: WebGLTexture;

	public width = 0;
	public height = 0;

	public constructor(private readonly gl: WebGL2RenderingContext) {
		const framebuffer = gl.createFramebuffer();
		const texture = gl.createTexture();
		if (!framebuffer || !texture) {
			throw new Error('Could not allocate a render target.');
		}
		this.framebuffer = framebuffer;
		this.texture = texture;

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			texture,
			0
		);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	/** Reallocates only when the size actually changed. */
	public resize(width: number, height: number): void {
		const w = Math.max(1, Math.floor(width));
		const h = Math.max(1, Math.floor(height));
		if (w === this.width && h === this.height) {
			return;
		}
		this.width = w;
		this.height = h;

		const { gl } = this;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA8,
			w,
			h,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null
		);
	}

	public bind(): void {
		const { gl } = this;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.viewport(0, 0, this.width, this.height);
	}

	public dispose(): void {
		this.gl.deleteFramebuffer(this.framebuffer);
		this.gl.deleteTexture(this.texture);
	}
}
