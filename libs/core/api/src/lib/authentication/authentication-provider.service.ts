import { BaseService } from '@music-collection/common/api';

/**
 * A bejelentkezés platformfüggő része. A webes változat felugró ablakot nyit
 * (`signInWithPopup`), a mobil (Capacitor) változat a natív Google SDK-t
 * használja, mert a WebView-ban a popup nem működik.
 *
 * Az effect csak ezt a szerződést ismeri, így a bejelentkezési folyamat
 * mindkét alkalmazásban ugyanaz marad.
 */
export abstract class AuthenticationProviderService extends BaseService {
	public abstract signInWithGoogle(): Promise<void>;
	public abstract signOut(): Promise<void>;
}
