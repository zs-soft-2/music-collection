import { Observable, of } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { User, UserDataService } from '@music-collection/api';

@Injectable()
export class UserDataServiceImpl extends UserDataService {
  private userCollection: User[];

  public constructor() {
    super();

    this.userCollection = [];
  }

  public add$(user: User): Observable<User> {
    return of(user);
  }

  public delete$(user: User): Observable<User> {
    return of(user);
  }

  public list$(): Observable<User[]> {
    return of(this.userCollection);
  }

  public load$(uid: string): Observable<User | undefined> {
    const userDocument: User | undefined = this.userCollection.find(
      (user) => user.uid === uid
    );

    return of(userDocument);
  }

  public update$(user: User): Observable<User> {
    return of(user);
  }
}
