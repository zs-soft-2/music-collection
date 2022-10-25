import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LabelFormModule } from '../../../form/label-form.module';
import { LabelEditComponent } from './label-edit.component';

describe('LabelEditComponent', () => {
  let component: LabelEditComponent;
  let fixture: ComponentFixture<LabelEditComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LabelEditComponent],
      imports: [LabelFormModule],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
