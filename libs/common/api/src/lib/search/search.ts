import { EntityTypeEnum } from '../entity';

export interface Searchable {
	searchParameters: string[];
}

/**
 * What a name is searched by: its growing prefixes in lower case, which is
 * what every `searchParameters` field holds — a search for "amo" looks for
 * itself in the list. The catalog writes them on the server as well
 * (`apps/functions`), and the two must agree, or a band imported there could
 * not be found by a name typed here.
 */
export const searchParameters = (name: string): string[] => {
	const prefixes: string[] = [];
	let prefix = '';

	for (const character of name) {
		prefix += character.toLowerCase();
		prefixes.push(prefix);
	}

	return prefixes;
};

export interface SearchParam {
	entityType: EntityTypeEnum;
	query: ParamItem<unknown>;
}

export interface ParamItem<T> {
	field: string;
	queryConstraint: QueryConstraintTypeEnum;
	operation: QueryOperatorEnum;
	value: T;
}

export type SearchParams = SearchParam[];

export enum QueryOperatorEnum {
	less = '<',
	lessEqual = '<=',
	equal = '==',
	notEqual = '!=',
	greaterEqual = '>=',
	greater = '>',
	arrayContains = 'array-contains',
	in = 'in',
	arrayContainsAny = 'array-contains-any',
	notIn = 'not-in',
}

export enum QueryConstraintTypeEnum {
	where = 'where',
	orderBy = 'orderBy',
	limit = 'limit',
	limitToLast = 'limitToLast',
	startAt = 'startAt',
	startAfter = 'startAfter',
	endAt = 'endAt',
	endBefore = 'endBefore',
}
