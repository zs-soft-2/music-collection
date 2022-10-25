import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AlbumCollectionModule } from '../../../collection/album-collection.module';
import { AlbumListPageComponent } from './album-list-page.component';

describe('AlbumListComponent', () => {
  let component: AlbumListPageComponent;
  let fixture: ComponentFixture<AlbumListPageComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AlbumListPageComponent],
      imports: [AlbumCollectionModule],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AlbumListPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
