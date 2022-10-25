import { TestBed } from '@angular/core/testing';

import { LabelFormService } from './label-form.service';

describe('LabelFormService', () => {
  let service: LabelFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LabelFormService],
    });

    service = TestBed.inject(LabelFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
