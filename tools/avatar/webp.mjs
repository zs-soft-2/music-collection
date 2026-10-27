/**
 * Reading a webp's header without decoding it.
 *
 * Both the publisher (`upload-assets.mjs`) and the archive
 * (`archive-source.mjs`) need the same answer to "is this a picture, and how
 * big is it". A second copy of the check would eventually accept a file the
 * other one rejects.
 */

import { open, stat } from 'node:fs/promises';

/** The file's length in bytes. */
export async function size(path) {
	return (await stat(path)).size;
}

/**
 * Why a file is not a picture, or null where it is one.
 *
 * A webp announces its own length in the RIFF header, so a file cut short —
 * a download that stopped, a drawing that never finished — is recognisable
 * without decoding all three hundred of them.
 */
export async function unreadable(path) {
	const bytes = await size(path);

	if (bytes === 0) {
		return 'empty';
	}

	const head = await read(path, 12);

	if (head.subarray(0, 4).toString() !== 'RIFF') {
		return 'not a webp';
	}

	const declared = head.readUInt32LE(4) + 8;

	return declared === bytes ? null : `truncated at ${bytes} of ${declared}`;
}

/**
 * `{ width, height }` of a webp in pixels, or null where the header is
 * neither of the two shapes these pictures come in.
 *
 * The wardrobe arrives in both: a plain lossy frame (`VP8 `) where the
 * garment fills the frame, and the extended header (`VP8X`) wherever the
 * drawing carries an alpha channel — a layer that has to let the body
 * through. They keep the size in different places, so both are read.
 */
export async function dimensions(path) {
	const head = await read(path, 30);

	if (head.length < 30 || head.subarray(0, 4).toString() !== 'RIFF') {
		return null;
	}

	const chunk = head.subarray(12, 16).toString();

	// Extended header: a ten-byte chunk whose canvas size is stored as three
	// bytes each, one less than the real thing.
	if (chunk === 'VP8X') {
		return {
			width: head.readUIntLE(24, 3) + 1,
			height: head.readUIntLE(27, 3) + 1,
		};
	}

	// Plain lossy frame: three bytes of frame tag, the start code that says
	// the rest is a key frame, then the size in fourteen bits each.
	if (chunk === 'VP8 ' && head.readUIntBE(23, 3) === 0x9d012a) {
		return {
			width: head.readUInt16LE(26) & 0x3fff,
			height: head.readUInt16LE(28) & 0x3fff,
		};
	}

	return null;
}

/** The first `bytes` of a file, or fewer where it is shorter. */
async function read(path, bytes) {
	const buffer = Buffer.alloc(bytes);
	const file = await open(path);
	let length = 0;

	try {
		({ bytesRead: length } = await file.read(buffer, 0, bytes, 0));
	} finally {
		await file.close();
	}

	return buffer.subarray(0, length);
}
