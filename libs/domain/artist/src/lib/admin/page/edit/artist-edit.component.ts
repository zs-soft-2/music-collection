import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mc-artist-edit',
  templateUrl: './artist-edit.component.html',
  styleUrls: ['./artist-edit.component.scss'],
})
export class ArtistEditComponent extends BaseComponent implements OnInit {
  public artistId!: string;

  public constructor(private activatedRoute: ActivatedRoute) {
    super();
  }

  public ngOnInit(): void {
    this.artistId = this.activatedRoute.snapshot.params['artistId'];
  }
}
