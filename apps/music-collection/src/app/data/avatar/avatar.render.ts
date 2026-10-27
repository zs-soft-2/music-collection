import {
	AVATAR_SIZE,
	AVATAR_TATTOO_GLYPHS,
	AVATAR_TATTOO_MARK,
	AvatarLook,
	AvatarView,
	avatarLayers,
	showsTattoo,
} from './avatar.model';

/**
 * The head-and-shoulders square, in the layers' own coordinates.
 *
 * Everywhere an avatar already appears — the top bar, the map pin, another
 * collector's card — it is a small circle, and the middle of a full-length
 * figure is a chest. So the picture kept for those places is this crop, and
 * none of them needed changing. It is wide enough for the longest hair and
 * deep enough for the shoulders.
 */
export const AVATAR_PORTRAIT = { x: 232, y: 24, size: 620 } as const;

/** What a rendered picture shows. */
export type AvatarCrop = 'portrait' | 'full';

export interface AvatarRenderOptions {
	crop?: AvatarCrop;
	/** Width of the rendered picture; the height follows the crop. */
	width?: number;
	/** JPEG quality, between 0 and 1. */
	quality?: number;
}

/** The picture kept for the profile: small, square, and the face in it. */
export const PROFILE_PICTURE: Required<AvatarRenderOptions> = {
	crop: 'portrait',
	width: 384,
	quality: 0.85,
};

/**
 * Draws the look as one picture.
 *
 * Every layer is drawn into the wardrobe's own 1024×1536 coordinates however
 * large the stored file happens to be, so re-cutting the images to a smaller
 * size never moves anything — and the tattoo, which is drawn rather than
 * photographed, lands where the preview's SVG puts it, on the same numbers.
 */
export async function drawAvatar(
	look: AvatarLook,
	view: AvatarView,
	urlOf: (file: string) => string,
	options: AvatarRenderOptions = {}
): Promise<HTMLCanvasElement> {
	const { crop, width } = { ...PROFILE_PICTURE, ...options };
	const source =
		crop === 'portrait'
			? {
					x: AVATAR_PORTRAIT.x,
					y: AVATAR_PORTRAIT.y,
					width: AVATAR_PORTRAIT.size,
					height: AVATAR_PORTRAIT.size,
				}
			: { x: 0, y: 0, ...AVATAR_SIZE };
	const scale = width / source.width;
	const canvas = document.createElement('canvas');

	canvas.width = Math.round(source.width * scale);
	canvas.height = Math.round(source.height * scale);

	const context = canvas.getContext('2d');

	if (!context) {
		throw new Error('Canvas unavailable');
	}

	// The whole figure is drawn, then the crop is taken out of it: a layer
	// only partly inside the crop still has to be drawn whole to be cut.
	context.scale(scale, scale);
	context.translate(-source.x, -source.y);

	const files = avatarLayers(look, view);
	const images = await Promise.all(
		files.map((file) => loadAvatarLayer(urlOf(file)))
	);

	for (const image of images) {
		context.drawImage(image, 0, 0, AVATAR_SIZE.width, AVATAR_SIZE.height);
	}

	if (view === 'front' && showsTattoo(look)) {
		inkTattoo(context, AVATAR_TATTOO_GLYPHS[look.tattoo]);
	}

	return canvas;
}

/** The look as a file, ready to be uploaded or handed to the collector. */
export async function renderAvatar(
	look: AvatarLook,
	view: AvatarView,
	urlOf: (file: string) => string,
	options: AvatarRenderOptions = {}
): Promise<Blob> {
	const { quality } = { ...PROFILE_PICTURE, ...options };
	const canvas = await drawAvatar(look, view, urlOf, options);

	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) =>
				blob ? resolve(blob) : reject(new Error('Rendering failed')),
			'image/jpeg',
			quality
		)
	);
}

function inkTattoo(context: CanvasRenderingContext2D, glyph: string): void {
	const { x, y, fontSize, rotation, color, opacity } = AVATAR_TATTOO_MARK;

	context.save();
	context.translate(x, y);
	context.rotate((rotation * Math.PI) / 180);
	context.globalAlpha = opacity;
	context.fillStyle = color;
	context.font = `bold ${fontSize}px sans-serif`;
	context.textAlign = 'center';
	context.textBaseline = 'alphabetic';
	context.fillText(glyph, 0, 0);
	context.restore();
}

/**
 * One layer, decoded and ready to draw — the same element every time it is
 * asked for.
 *
 * The cache is what keeps the preview from flickering: a look is only shown
 * once all of its layers have loaded, and re-choosing a garment worn a moment
 * ago is then instant rather than another round trip. It also makes rendering
 * the saved picture free — the editor has already loaded exactly these files.
 *
 * `crossOrigin` is what lets the canvas be read back afterwards: the layers
 * come from Storage, and an image loaded without it taints the canvas, so
 * `toBlob` would throw instead of returning a picture. A layer that fails to
 * load is an error rather than a silently missing garment — the old download
 * swallowed both, and quietly saved a character with no trousers.
 */
const loaded = new Map<string, Promise<HTMLImageElement>>();

export function loadAvatarLayer(url: string): Promise<HTMLImageElement> {
	const pending = loaded.get(url);

	if (pending) {
		return pending;
	}

	const image = new Promise<HTMLImageElement>((resolve, reject) => {
		const element = new Image();

		element.crossOrigin = 'anonymous';
		element.decoding = 'async';
		element.addEventListener('load', () => resolve(element), {
			once: true,
		});
		element.addEventListener(
			'error',
			() => {
				// A layer that failed once may well load next time (a lost
				// connection, a cold bucket): let the next asker try again.
				loaded.delete(url);
				reject(new Error(`Avatar layer unavailable: ${url}`));
			},
			{ once: true }
		);
		element.src = url;
	});

	loaded.set(url, image);

	return image;
}
