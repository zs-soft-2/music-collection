import { ActionEnum } from '../action';
import { UserResourceEnum } from './user-resource.enum';

export class UserPermissionsService {
  public static readonly createUserEntity =
    ActionEnum.CREATE.toString() + UserResourceEnum.USER_ENTITY.toString();
  public static readonly deleteUserEntity =
    ActionEnum.DELETE.toString() + UserResourceEnum.USER_ENTITY.toString();
  public static readonly updateUserEntity =
    ActionEnum.UPDATE.toString() + UserResourceEnum.USER_ENTITY.toString();
  public static readonly viewUserEntity =
    ActionEnum.VIEW.toString() + UserResourceEnum.USER_ENTITY.toString();
}
