import { ActionEnum } from '../action';
import { EntityQuantityResourceEnum } from './entity-quantity-resource.enum';

/**
 * A darabszám-dokumentum írása.
 *
 * Egyetlen permission mind a három íráshoz: a szabály a felvételt, a
 * módosítást és a törlést is `updateEntityQuantityEntity`-hez köti, mert a
 * dokumentum a szinkron mellékterméke, nem külön kezelt entitás. Ezért nincs
 * `create…`/`delete…` konstans — olyan jogot neveznének meg, amit senki nem
 * kérdez meg.
 */
export class EntityQuantityPermissionsService {
	static readonly updateEntityQuantityEntity =
		ActionEnum.UPDATE.toString() +
		EntityQuantityResourceEnum.ENTITY_QUANTITY_ENTITY.toString();
}
