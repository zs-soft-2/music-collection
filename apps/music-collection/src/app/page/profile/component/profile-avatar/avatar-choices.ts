import {
	AVATAR_AGES,
	AVATAR_BODIES,
	AVATAR_FACES,
	AVATAR_GLASSES,
	AVATAR_HAIRS,
	AVATAR_NECKLACES,
	AVATAR_OUTFITS,
	AVATAR_PANTS,
	AVATAR_PATCHES,
	AVATAR_SHIRT_STYLES,
	AVATAR_TATTOOS,
	AVATAR_WRISTS,
	AvatarLook,
	hasOuterwear,
	showsTattoo,
} from '../../../../data/avatar';

/** One row of choices in the editor. */
export interface AvatarChoiceGroup {
	key: keyof AvatarLook;
	values: readonly string[];
	/** Hair is chosen by its picture; everything else reads well as words. */
	thumbnails?: boolean;
	/**
	 * Whether the look can show this at all. A choice that would not appear
	 * is offered greyed out rather than taken away — the row keeps its place,
	 * and the hint says what the character has to wear for it to show.
	 */
	shows?: (look: AvatarLook) => boolean;
}

/**
 * The order the character is built in: the body first, then the face it
 * carries, then what it wears, and the details last.
 *
 * Each group's label is `ui.avatarEditor.group.{key}` and each choice is
 * `ui.avatarEditor.{key}.{value}`; a group that can be hidden by the rest of
 * the look also has `ui.avatarEditor.needs.{key}`.
 */
export const AVATAR_GROUPS: readonly AvatarChoiceGroup[] = [
	{ key: 'body', values: AVATAR_BODIES },
	{ key: 'age', values: AVATAR_AGES },
	{ key: 'face', values: AVATAR_FACES },
	{ key: 'hair', values: AVATAR_HAIRS, thumbnails: true },
	{ key: 'glasses', values: AVATAR_GLASSES },
	{ key: 'shirtStyle', values: AVATAR_SHIRT_STYLES },
	{ key: 'outfit', values: AVATAR_OUTFITS },
	{ key: 'pants', values: AVATAR_PANTS },
	{ key: 'wrist', values: AVATAR_WRISTS },
	{ key: 'necklace', values: AVATAR_NECKLACES },
	{
		key: 'patch',
		values: AVATAR_PATCHES,
		// Sewn onto the back of a vest or jacket; a t-shirt has no back for it.
		shows: (look) => hasOuterwear(look.outfit),
	},
	{
		key: 'tattoo',
		values: AVATAR_TATTOOS,
		// Inked on a bare arm, so a sleeve covers it.
		shows: (look) => showsTattoo({ ...look, tattoo: 'star' }),
	},
];
