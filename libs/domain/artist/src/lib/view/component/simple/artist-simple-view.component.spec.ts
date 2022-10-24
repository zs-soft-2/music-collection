import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArtistSimpleViewComponent } from './artist-simple-view.component';

describe('ArtistSimpleViewComponent', () => {
  let component: ArtistSimpleViewComponent;
  let fixture: ComponentFixture<ArtistSimpleViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ArtistSimpleViewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtistSimpleViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
