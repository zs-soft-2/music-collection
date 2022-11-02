import { FormGroup } from '@angular/forms';

import { BaseService } from '../base';

export abstract class EntityUtilService<R, S, T> extends BaseService {
	public abstract _sort(a: R, b: R): number;
	public abstract createEntity(formGroup: FormGroup): S;
	public abstract createFormGroup(entity: R | undefined): FormGroup;
	public abstract updateEntity(formGroup: FormGroup): T;

	public createSearchParameters(name: string): string[] {
		const searchOptions: string[] = [];
		let temp = '';

		for (let i = 0; i < name.length; i++) {
			temp = temp + name[i].toLowerCase();

			searchOptions.push(temp);
		}

		return searchOptions;
	}
}
