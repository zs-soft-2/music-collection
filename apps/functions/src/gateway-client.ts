/**
 * A közös csatlakozás az AI-gatewayhez. Minden modellhívás ezen megy ki: a
 * szolgáltatót és a modellt a gateway választja, a szolgáltatói kulcsok nála
 * vannak, nálunk csak az ő tenant-kulcsa él (`GATEWAY_API_KEY`).
 *
 * Azért külön fájl, mert már nem egy hívó van: a fotós felismerés
 * (`vision-client.ts`) és a badge-rajzolás (`badge-generation.ts`) is innen
 * veszi a klienst, és ami ezután jön, az is ide fog kötni.
 */

import { AiGatewayClient } from '@zssz-soft/zs-ai-sdk';

/** A gateway naplóiban és fogyasztási soraiban ez a név azonosít minket. */
export const APPLICATION_ID = 'music-collection';

export interface GatewaySettings {
	/** A gateway címe `/api/v1` nélkül, pl. `https://….run.app`. */
	baseUrl: string;
	apiKey: string;
}

/** Amit a hívók a kliensből használnak — a tesztek ezt cserélik. */
export type GatewayClient = Pick<AiGatewayClient, 'execute'>;

/**
 * A kliens egy adott kérés-időkerettel. A keret a hívóé, mert ő tudja,
 * mennyi fér bele a function idejébe a modell mellett (Discogs, újrapróba).
 */
export function createGatewayClient(
	settings: GatewaySettings,
	timeoutMs: number
): GatewayClient {
	return new AiGatewayClient({
		baseUrl: settings.baseUrl.replace(/\/+$/, ''),
		apiKey: settings.apiKey,
		applicationId: APPLICATION_ID,
		fetchImpl: (input, init) =>
			fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) }),
	});
}
