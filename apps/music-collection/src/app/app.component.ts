import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AuthenticationStateService } from '@music-collection/api';

@Component({
  selector: 'mc-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  public title = 'music-collection';

  public constructor(
    private authenticationStateService: AuthenticationStateService
  ) {}

  public ngOnInit(): void {
    this.authenticationStateService.dispatchLogin();
  }
}
