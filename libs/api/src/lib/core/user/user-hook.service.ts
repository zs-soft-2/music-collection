import { User } from './user';

export abstract class UserHookService {
  public abstract loadEntity(user: User): void;
}
