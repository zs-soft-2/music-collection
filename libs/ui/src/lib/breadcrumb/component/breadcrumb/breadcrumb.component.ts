import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Injector,
  Input,
  OnInit,
  TemplateRef,
} from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import {
  ActivatedRoute,
  NavigationEnd,
  Params,
  PRIMARY_OUTLET,
  Router,
} from '@angular/router';
import { filter, startWith, takeUntil } from 'rxjs/operators';

export interface BreadcrumbOption {
  label: string;
  params: Params;
  url: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mc-breadcrumb',
  templateUrl: './breadcrumb.component.html',
})
export class BreadcrumbComponent extends BaseComponent implements OnInit {
  @Input()
  public autoGenerate = false;
  public breadcrumbs: BreadcrumbOption[] = [];
  @Input()
  public routeLabel = 'breadcrumb';
  @Input()
  public separator: string | TemplateRef<void> | null = '/';
  @Input()
  public routeLabelFn: (label: string) => string = (label) => label;

  public constructor(
    private injector: Injector,
    private cdr: ChangeDetectorRef
  ) {
    super();
  }

  public navigate(url: string, e: MouseEvent): void {
    e.preventDefault();

    this.injector.get(Router).navigateByUrl(url);
  }

  public ngOnInit(): void {
    if (this.autoGenerate) {
      this.registerRouterChange();
    }
  }

  private getBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: BreadcrumbOption[] = []
  ): BreadcrumbOption[] {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      if (child.outlet === PRIMARY_OUTLET) {
        const routeUrl: string = child.snapshot.url
          .map((segment) => segment.path)
          .filter((path) => path)
          .join('/');

        const nextUrl = routeUrl ? `${url}/${routeUrl}` : url;
        const breadcrumbLabel = this.routeLabelFn(
          child.snapshot.data[this.routeLabel]
        );

        if (routeUrl && breadcrumbLabel) {
          const breadcrumb: BreadcrumbOption = {
            label: breadcrumbLabel,
            params: child.snapshot.params,
            url: nextUrl,
          };

          breadcrumbs.push(breadcrumb);
        }

        return this.getBreadcrumbs(child, nextUrl, breadcrumbs);
      }
    }

    return breadcrumbs;
  }

  private registerRouterChange(): void {
    try {
      const router = this.injector.get(Router);
      const activatedRoute = this.injector.get(ActivatedRoute);
      router.events
        .pipe(
          filter((e) => e instanceof NavigationEnd),
          takeUntil(this.destroy),
          startWith(true)
        )
        .subscribe(() => {
          this.breadcrumbs = this.getBreadcrumbs(activatedRoute.root);
          this.cdr.markForCheck();
        });
    } catch (e) {
      throw new Error(
        `You should import RouterModule if you want to use 'NzAutoGenerate'.`
      );
    }
  }
}
