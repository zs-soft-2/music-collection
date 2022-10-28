import { FormGroup } from '@angular/forms';

import { EntityUtilService } from '../../common';
import {
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate,
} from './document';

export abstract class DocumentUtilService extends EntityUtilService<
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate
> {
	public abstract createFilePath(data: string, folder?: string): string;
	public abstract createFormGroupByProperties(
		name: string | undefined,
		filePath: string | undefined,
		fileType: string | undefined,
		originalName: string | undefined,
		uid: string | undefined
	): FormGroup;
}
