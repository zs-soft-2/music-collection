/**
 * A fixed buffer of particle seeds. The buffer is filled once at the largest
 * count the quality allows; density then simply draws a prefix of it, so
 * turning the embers up never touches GPU memory mid-song.
 */
export class ParticleField {
	public readonly capacity: number;

	private readonly vao: WebGLVertexArrayObject;
	private readonly buffer: WebGLBuffer;

	public constructor(
		private readonly gl: WebGL2RenderingContext,
		capacity: number
	) {
		this.capacity = Math.max(1, Math.floor(capacity));

		const vao = gl.createVertexArray();
		const buffer = gl.createBuffer();
		if (!vao || !buffer) {
			throw new Error('Could not allocate the particle field.');
		}
		this.vao = vao;
		this.buffer = buffer;

		const seeds = new Float32Array(this.capacity * 4);
		for (let i = 0; i < this.capacity; i++) {
			seeds[i * 4] = Math.random();
			seeds[i * 4 + 1] = Math.random();
			seeds[i * 4 + 2] = Math.random();
			seeds[i * 4 + 3] = Math.random();
		}

		gl.bindVertexArray(vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(null);
	}

	public draw(count: number): void {
		const live = Math.min(this.capacity, Math.max(0, Math.floor(count)));
		if (live === 0) {
			return;
		}
		this.gl.bindVertexArray(this.vao);
		this.gl.drawArrays(this.gl.POINTS, 0, live);
	}

	public dispose(): void {
		this.gl.deleteVertexArray(this.vao);
		this.gl.deleteBuffer(this.buffer);
	}
}
