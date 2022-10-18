import { Identifiable } from '../../common';

export interface Role extends Identifiable {
  name: string;
  permissions: string[];
}
