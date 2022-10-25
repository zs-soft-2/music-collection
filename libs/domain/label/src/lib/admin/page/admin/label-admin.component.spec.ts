import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { LabelCollectionModule } from '../../../collection/label-collection.module';
import { LabelAdminComponent } from './label-admin.component';

describe('LabelAdminComponent', () => {
  let component: LabelAdminComponent;
  let fixture: ComponentFixture<LabelAdminComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LabelAdminComponent],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        LabelCollectionModule,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
