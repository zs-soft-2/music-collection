import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  LabelEntity,
  LabelEntityAdd,
  LabelEntityUpdate,
  LabelUtilService,
  ArtistEntity,
  EntityQuantityEntity,
  EntityQuantityEntityUpdate,
} from '@music-collection/api';

@Injectable()
export class LabelUtilServiceImpl extends LabelUtilService {
  public _sort = (a: LabelEntity, b: LabelEntity): number =>
    a.name < b.name ? 1 : -1;

  public constructor(private formBuilder: FormBuilder) {
    super();
  }

  public createEntity(formGroup: FormGroup): LabelEntityAdd {
    return {
      name: formGroup.value['name'],
      parent: formGroup.value['parent'],
    };
  }

  public updateEntity(formGroup: FormGroup): LabelEntityUpdate {
    return {
      uid: formGroup.value['uid'],
      name: formGroup.value['name'],
      parent: formGroup.value['parent'],
    };
  }

  public createFormGroup(label: LabelEntity | undefined): FormGroup {
    return this.formBuilder.group({
      uid: [label?.uid],
      name: [label?.name || null, [Validators.required]],
      parent: [label?.parent || null],
    });
  }

  public updateEntityQuantity(
    entityQuantity: EntityQuantityEntity
  ): EntityQuantityEntityUpdate {
    return {
      ...entityQuantity,
      quantity: entityQuantity.quantity + 1,
    };
  }
}
