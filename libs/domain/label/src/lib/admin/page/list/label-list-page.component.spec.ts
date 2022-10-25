import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LabelCollectionModule } from '../../../collection/label-collection.module';
import { LabelListPageComponent } from './label-list-page.component';

describe('LabelListComponent', () => {
  let component: LabelListPageComponent;
  let fixture: ComponentFixture<LabelListPageComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LabelListPageComponent],
      imports: [LabelCollectionModule],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelListPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
