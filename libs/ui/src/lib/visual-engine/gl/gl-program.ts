function compile(
	gl: WebGL2RenderingContext,
	type: number,
	source: string,
	label: string
): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) {
		throw new Error(`Could not create the ${label} shader.`);
	}
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`The ${label} shader did not compile: ${log}`);
	}
	return shader;
}

/**
 * A linked shader pair whose uniform locations are looked up once. Nothing here
 * allocates per frame — `getUniformLocation` in a render loop is the classic
 * way to lose frames to the driver.
 */
export class GlProgram {
	public readonly program: WebGLProgram;

	private readonly locations = new Map<string, WebGLUniformLocation | null>();

	public constructor(
		private readonly gl: WebGL2RenderingContext,
		vertexSource: string,
		fragmentSource: string,
		label = 'program'
	) {
		const vertex = compile(
			gl,
			gl.VERTEX_SHADER,
			vertexSource,
			`${label} vertex`
		);
		const fragment = compile(
			gl,
			gl.FRAGMENT_SHADER,
			fragmentSource,
			`${label} fragment`
		);

		const program = gl.createProgram();
		if (!program) {
			throw new Error(`Could not create the ${label} program.`);
		}
		gl.attachShader(program, vertex);
		gl.attachShader(program, fragment);
		gl.linkProgram(program);
		gl.deleteShader(vertex);
		gl.deleteShader(fragment);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const log = gl.getProgramInfoLog(program);
			gl.deleteProgram(program);
			throw new Error(`The ${label} program did not link: ${log}`);
		}
		this.program = program;
	}

	public use(): void {
		this.gl.useProgram(this.program);
	}

	private at(name: string): WebGLUniformLocation | null {
		let location = this.locations.get(name);
		if (location === undefined) {
			location = this.gl.getUniformLocation(this.program, name);
			this.locations.set(name, location);
		}
		return location;
	}

	public float(name: string, value: number): void {
		this.gl.uniform1f(this.at(name), value);
	}

	public vec2(name: string, x: number, y: number): void {
		this.gl.uniform2f(this.at(name), x, y);
	}

	public vec3(name: string, value: [number, number, number]): void {
		this.gl.uniform3f(this.at(name), value[0], value[1], value[2]);
	}

	public int(name: string, value: number): void {
		this.gl.uniform1i(this.at(name), value);
	}

	public dispose(): void {
		this.gl.deleteProgram(this.program);
		this.locations.clear();
	}
}
