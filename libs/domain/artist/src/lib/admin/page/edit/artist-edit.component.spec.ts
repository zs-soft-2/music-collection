import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ArtistFormModule } from '../../../form/artist-form.module';
import { ArtistEditComponent } from './artist-edit.component';

describe('ArtistEditComponent', () => {
  let component: ArtistEditComponent;
  let fixture: ComponentFixture<ArtistEditComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ArtistEditComponent],
      imports: [ArtistFormModule],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ArtistEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
