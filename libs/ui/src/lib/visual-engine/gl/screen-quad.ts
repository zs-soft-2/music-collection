/**
 * One oversized triangle covering the viewport. Cheaper than two triangles:
 * no diagonal seam for the rasteriser to straddle, and one fewer vertex.
 */
export class ScreenQuad {
	private readonly vao: WebGLVertexArrayObject;
	private readonly buffer: WebGLBuffer;

	public constructor(private readonly gl: WebGL2RenderingContext) {
		const vao = gl.createVertexArray();
		const buffer = gl.createBuffer();
		if (!vao || !buffer) {
			throw new Error('Could not allocate the screen quad.');
		}
		this.vao = vao;
		this.buffer = buffer;

		gl.bindVertexArray(vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 3, -1, -1, 3]),
			gl.STATIC_DRAW
		);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(null);
	}

	public draw(): void {
		this.gl.bindVertexArray(this.vao);
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
	}

	public dispose(): void {
		this.gl.deleteVertexArray(this.vao);
		this.gl.deleteBuffer(this.buffer);
	}
}
