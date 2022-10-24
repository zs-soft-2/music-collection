import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ArtistListModule } from '../../../list/artist-list.module';
import { ArtistListPageComponent } from './artist-list-page.component';

describe('ArtistListComponent', () => {
  let component: ArtistListPageComponent;
  let fixture: ComponentFixture<ArtistListPageComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ArtistListPageComponent],
      imports: [ArtistListModule],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ArtistListPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
