/**
 * What a document was made for.
 *
 * A document uploaded by hand has no category: it is a file someone picked,
 * and nothing more is known about it. The ones a machine files carry one, so
 * the admin list can group them and offer what only they need — the badges
 * drawn for the collections are the first such set.
 */
export enum DocumentCategoryEnum {
	Badge = 'badge',
}
