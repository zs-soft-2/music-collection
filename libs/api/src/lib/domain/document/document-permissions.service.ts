import { ActionEnum } from '../../core';
import { DocumentResourceEnum } from './document-resource.enum';

export class DocumentPermissionsService {
	static readonly createDocumentEntity =
		ActionEnum.CREATE.toString() +
		DocumentResourceEnum.DOCUMENT_ENTITY.toString();
	static readonly deleteDocumentEntity =
		ActionEnum.DELETE.toString() +
		DocumentResourceEnum.DOCUMENT_ENTITY.toString();
	static readonly updateDocumentEntity =
		ActionEnum.UPDATE.toString() +
		DocumentResourceEnum.DOCUMENT_ENTITY.toString();
	static readonly viewDocumentEntity =
		ActionEnum.VIEW.toString() +
		DocumentResourceEnum.DOCUMENT_ENTITY.toString();
}
