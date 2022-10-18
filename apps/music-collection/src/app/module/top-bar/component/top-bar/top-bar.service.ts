import { Observable, ReplaySubject, Subject } from 'rxjs';

import { Injectable } from '@angular/core';
import { Router, RouterStateSnapshot } from '@angular/router';

import { MenuItem, TopBarParams } from '../../api';

@Injectable()
export class TopBarService {
  private currentPath!: string;
  private params!: TopBarParams;
  private params$$: Subject<TopBarParams>;

  constructor(private router: Router) {
    this.params$$ = new ReplaySubject();
  }

  public createMenuItems(): MenuItem[] {
    return [];
  }

  public init$(): Observable<TopBarParams> {
    this.params = {
      addPagePermissions: [],
      editPagePermissions: [],
      menuItems: this.createMenuItems(),
    };

    this.params$$.next(this.params);

    return this.params$$;
  }
}
