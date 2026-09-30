import { ActionEnum } from '../action';
import { SecurityResourceEnum } from './security-resource.enum';

/**
 * A `security/users/{uid}` alatti jogosultság-dokumentumok olvasása: mással
 * mint magával mit engedélyez a rendszer.
 *
 * Csak olvasás adható ki. A dokumentumot a szerveroldali szinkron írja Admin
 * SDK-val, ami a szabályok fölött jár — kliensoldali írás-permission azt
 * ígérné, hogy van mit kiadni.
 */
export class SecurityPermissionsService {
	static readonly viewSecurityEntity =
		ActionEnum.VIEW.toString() +
		SecurityResourceEnum.SECURITY_ENTITY.toString();
}
