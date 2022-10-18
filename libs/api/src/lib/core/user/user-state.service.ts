import { EntityStateService } from '../../common';
import { User } from './user';

export abstract class UserStateService extends EntityStateService<
  User,
  User,
  User
> {
  public abstract dispatchLoadExistedUserAction(user: User): void;
}
