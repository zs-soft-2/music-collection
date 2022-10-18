import { Directive, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Directive({
  selector: '[mcBase]',
})
export abstract class BaseDirective implements OnDestroy {
  protected destroy: Subject<boolean>;

  public constructor() {
    this.destroy = new Subject();
  }

  public ngOnDestroy(): void {
    this.destroy.next(true);
    this.destroy.complete();
  }
}
