import { EntityUtilService } from '../../common';
import { LabelEntity, LabelEntityAdd, LabelEntityUpdate } from './label';

export abstract class LabelUtilService extends EntityUtilService<
  LabelEntity,
  LabelEntityAdd,
  LabelEntityUpdate
> {}
