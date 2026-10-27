import { PublicCollectorProfile } from './collector-profile.model';

/**
 * The picture a collector sends along with their link.
 *
 * A link to this app arrives in a chat as a grey rectangle: the page is an
 * Angular app with no server rendering, so there is no `og:image` for the
 * chat to find, and a link nobody can see is a link nobody opens. The picture
 * is drawn here instead, in the collector's own browser, and handed to the
 * share sheet next to the address — which is the half of sharing that
 * actually travels.
 *
 * Everything is drawn from the published snapshot, so the card says exactly
 * what the page says.
 */

/** The shape chats preview best: the usual 1.91:1 of a link card. */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

/** How many covers the mosaic holds, and how they are laid out. */
const MOSAIC_COLUMNS = 3;
const MOSAIC_ROWS = 2;
export const MOSAIC_COUNT = MOSAIC_COLUMNS * MOSAIC_ROWS;

/** The app's own dark palette, as `styles.scss` defines it. */
const INK = '#0a0a0a';
const PAPER = '#ffffff';
const MUTED = '#a8a8a8';
const ACCENT = '#ff4444';
const PLATE = '#1e1e1e';

const MARGIN = 64;
const MOSAIC_GAP = 12;
/**
 * How much of the width the writing gets. The mosaic takes what is left, and
 * its tiles are cut to fit that — rather than the tiles being a fixed size
 * and the writing running underneath them, which is what a square-tile-first
 * layout does as soon as the card is not very wide.
 */
const TEXT_COLUMN = 0.55;
/** The name, from the size it would like down to the size that fits. */
const NAME_SIZES = [96, 78, 62, 50];

/** The words on the card, which only the caller knows in the right language. */
export interface ShareCardLabels {
	records: string;
	points: string;
	badges: string;
	/** The line under the name — what this app is. */
	tagline: string;
}

/**
 * The one line that carries the collection: "312 records · 1240 points · 4
 * badges". A part with nothing in it is left out rather than written as a
 * zero — a collector with no badge yet is not advertising that.
 */
export function shareCardSummary(
	profile: PublicCollectorProfile,
	labels: ShareCardLabels
): string {
	const parts = [`${profile.numbers.copies} ${labels.records}`];

	if (profile.points.total > 0) {
		parts.push(`${profile.points.total} ${labels.points}`);
	}

	if (profile.points.completedCollections > 0) {
		parts.push(`${profile.points.completedCollections} ${labels.badges}`);
	}

	return parts.join(' · ');
}

/** The place, where the collector shares one. */
export function shareCardPlace(profile: PublicCollectorProfile): string {
	return [profile.city, profile.countryCode].filter(Boolean).join(', ');
}

/** The covers the mosaic will try to draw, newest-first as the window holds them. */
export function shareCardCovers(profile: PublicCollectorProfile): string[] {
	return profile.showcase
		.map((record) => record.coverUrl)
		.filter((url): url is string => !!url && url.startsWith('https://'))
		.slice(0, MOSAIC_COUNT);
}

/**
 * One cover, ready to draw — or nothing.
 *
 * `crossOrigin` is what lets the canvas be read back afterwards: a picture
 * loaded without it taints the canvas and `toBlob` throws. Catalog covers sit
 * in our own Storage, which answers that; a cover that came from somewhere
 * else may not, and then the mosaic simply has one tile fewer. A missing
 * picture is not worth failing a share over.
 */
function loadCover(url: string): Promise<HTMLImageElement | null> {
	return new Promise((resolve) => {
		const element = new Image();

		element.crossOrigin = 'anonymous';
		element.decoding = 'async';
		element.addEventListener('load', () => resolve(element), {
			once: true,
		});
		element.addEventListener('error', () => resolve(null), { once: true });
		element.src = url;
	});
}

/** Draws text that stops rather than runs off the card. */
function fitText(
	context: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	maxWidth: number
): void {
	let shown = text;

	while (shown.length > 1 && context.measureText(shown).width > maxWidth) {
		shown = shown.slice(0, -2);
	}

	context.fillText(shown === text ? text : `${shown}…`, x, y);
}

/**
 * The name at the largest size it fits in, and only clipped once the
 * smallest would still run over. A name is the one thing on the card worth
 * reading whole.
 */
function drawName(
	context: CanvasRenderingContext2D,
	name: string,
	x: number,
	y: number,
	maxWidth: number
): void {
	const face = (size: number) =>
		`${size}px 'Bebas Neue', Oswald, Impact, sans-serif`;
	const size =
		NAME_SIZES.find((candidate) => {
			context.font = face(candidate);

			return context.measureText(name).width <= maxWidth;
		}) ?? NAME_SIZES[NAME_SIZES.length - 1];

	context.font = face(size);
	fitText(context, name, x, y, maxWidth);
}

function drawMosaic(
	context: CanvasRenderingContext2D,
	covers: (HTMLImageElement | null)[]
): void {
	const left = CARD_WIDTH * TEXT_COLUMN;
	const size = Math.floor(
		(CARD_WIDTH - left - MARGIN - MOSAIC_GAP * (MOSAIC_COLUMNS - 1)) /
			MOSAIC_COLUMNS
	);
	// Centred down the card rather than hung from the top margin: the writing
	// beside it is centred too, and two blocks that start at different
	// heights read as one of them having slipped.
	const top =
		(CARD_HEIGHT - size * MOSAIC_ROWS - MOSAIC_GAP * (MOSAIC_ROWS - 1)) / 2;

	covers.forEach((cover, index) => {
		const x = left + (index % MOSAIC_COLUMNS) * (size + MOSAIC_GAP);
		const y =
			top + Math.floor(index / MOSAIC_COLUMNS) * (size + MOSAIC_GAP);

		context.fillStyle = PLATE;
		context.fillRect(x, y, size, size);

		if (cover) {
			// Square sleeves on a square tile: the shorter side decides, so a
			// cover scanned slightly off is cropped rather than squashed.
			const edge = Math.min(cover.width, cover.height);

			context.drawImage(
				cover,
				(cover.width - edge) / 2,
				(cover.height - edge) / 2,
				edge,
				edge,
				x,
				y,
				size,
				size
			);
		}
	});
}

/**
 * The card as a canvas: the collection on the left, its covers on the right.
 */
export async function drawShareCard(
	profile: PublicCollectorProfile,
	labels: ShareCardLabels,
	name: string
): Promise<HTMLCanvasElement> {
	const canvas = document.createElement('canvas');

	canvas.width = CARD_WIDTH;
	canvas.height = CARD_HEIGHT;

	const context = canvas.getContext('2d');

	if (!context) {
		throw new Error('Canvas unavailable');
	}

	// The display face may still be loading; waiting for it is the difference
	// between the app's own lettering and a fallback.
	await document.fonts?.ready;

	context.fillStyle = INK;
	context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

	const covers = await Promise.all(shareCardCovers(profile).map(loadCover));

	if (covers.length) {
		drawMosaic(context, covers);
	}

	// The writing keeps its own column: a mosaic drawn beside it must not be
	// something the name runs underneath.
	const textWidth =
		(covers.length
			? CARD_WIDTH * TEXT_COLUMN - MARGIN
			: CARD_WIDTH - MARGIN) - MARGIN;

	context.textBaseline = 'alphabetic';

	context.fillStyle = ACCENT;
	context.font = '600 26px Inter, system-ui, sans-serif';
	context.letterSpacing = '4px';
	fitText(context, labels.tagline.toUpperCase(), MARGIN, 150, textWidth);
	context.letterSpacing = '0px';

	context.fillStyle = PAPER;
	drawName(context, name, MARGIN, 260, textWidth);

	context.fillStyle = PAPER;
	context.font = '600 34px Inter, system-ui, sans-serif';
	fitText(context, shareCardSummary(profile, labels), MARGIN, 330, textWidth);

	const place = shareCardPlace(profile);

	if (place) {
		context.fillStyle = MUTED;
		context.font = '28px Inter, system-ui, sans-serif';
		fitText(context, place, MARGIN, 380, textWidth);
	}

	context.fillStyle = ACCENT;
	context.fillRect(MARGIN, CARD_HEIGHT - MARGIN - 44, 56, 4);

	context.fillStyle = MUTED;
	context.font = '26px Inter, system-ui, sans-serif';
	fitText(context, 'musiCollection', MARGIN, CARD_HEIGHT - MARGIN, textWidth);

	return canvas;
}

/** The card as a file, ready for the share sheet or a download. */
export async function renderShareCard(
	profile: PublicCollectorProfile,
	labels: ShareCardLabels,
	name: string
): Promise<Blob> {
	const canvas = await drawShareCard(profile, labels, name);

	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) =>
				blob ? resolve(blob) : reject(new Error('Card not rendered')),
			'image/png'
		)
	);
}
