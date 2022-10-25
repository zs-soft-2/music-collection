import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelTableComponent } from './label-table.component';

describe('LabelTableComponent', () => {
  let component: LabelTableComponent;
  let fixture: ComponentFixture<LabelTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LabelTableComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
