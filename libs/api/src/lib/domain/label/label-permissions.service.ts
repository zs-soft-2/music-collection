import { ActionEnum } from '../../core';
import { LabelResourceEnum } from './label-resource.enum';

export class LabelPermissionsService {
  static readonly createLabelEntity =
    ActionEnum.CREATE.toString() + LabelResourceEnum.LABEL_ENTITY.toString();
  static readonly deleteLabelEntity =
    ActionEnum.DELETE.toString() + LabelResourceEnum.LABEL_ENTITY.toString();
  static readonly updateLabelEntity =
    ActionEnum.UPDATE.toString() + LabelResourceEnum.LABEL_ENTITY.toString();
  static readonly viewLabelEntity =
    ActionEnum.VIEW.toString() + LabelResourceEnum.LABEL_ENTITY.toString();
}
