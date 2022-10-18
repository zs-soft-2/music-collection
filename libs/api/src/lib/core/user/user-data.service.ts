import { EntityDataService } from '../../common';
import { User } from './user';

export abstract class UserDataService extends EntityDataService<
  User,
  User,
  User
> {}
