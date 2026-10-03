/**
 * A képolvasás csatlakozása az AI-gatewayhez. A lemez- és a polcfotó is
 * innen megy ki: a modellt nem mi hívjuk, hanem a gateway, a szolgáltatói
 * kulcs is nála van. Nálunk csak a gateway saját API-kulcsa él
 * (`GATEWAY_API_KEY`).
 *
 * A gateway szabja meg a hívás alakját. Két dolog, amit a közvetlen
 * Anthropic-hívás tudott, itt nincs meg: a gondolkodási mélység (`effort`)
 * és a szerveroldali tartalék modell elzárkózás esetén. Mindkettő igényként
 * áll az ai-gateway `docs/gateway-nyitott-feladatok.md` „Fogyasztói igények"
 * szakaszában; amíg nem kerülnek be, a modell az alapbeállításával fut, az
 * elzárkózás pedig hibaként jön vissza.
 */

import {
	AiGatewayClient,
	type ResponseSchema,
	ZsAiError,
} from '@zssz-soft/zs-ai-sdk';

/** A gateway naplóiban és fogyasztási soraiban ez a név azonosít minket. */
const APPLICATION_ID = 'music-collection';

/**
 * Egy újrapróbálás a múló hibákra (túlterhelt szolgáltató, hálózat, rövid
 * sebességkorlát). Kettőnél több próba már a function keretét enné, és a
 * gateway maga is választ másik útvonalat, ha egy szolgáltató kiesik.
 */
const MAX_ATTEMPTS = 2;
/** A gateway `Retry-After`-jéből legfeljebb ennyit várunk ki. */
const MAX_RETRY_WAIT_MS = 5_000;

/** Amit a képolvasás a gateway-klienstől használ — a tesztek ezt cserélik. */
export type VisionClient = Pick<AiGatewayClient, 'execute'>;

export interface GatewaySettings {
	/** A gateway címe `/api/v1` nélkül, pl. `https://….run.app`. */
	baseUrl: string;
	apiKey: string;
}

/**
 * A kliens egy adott kérés-időkerettel. A keret a hívóé, mert ő tudja,
 * mennyi fér bele a function idejébe a modell mellett (Discogs, újrapróba).
 */
export function createVisionClient(
	settings: GatewaySettings,
	timeoutMs: number
): VisionClient {
	return new AiGatewayClient({
		baseUrl: settings.baseUrl.replace(/\/+$/, ''),
		apiKey: settings.apiKey,
		applicationId: APPLICATION_ID,
		fetchImpl: (input, init) =>
			fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) }),
	});
}

/**
 * A képolvasás hibája. A hívónak el kell tudnia választani a Discogsétól,
 * különben rossz okot mond a gyűjtőnek — a modell túlterheltsége nem az,
 * hogy a Discogs elérhetetlen. `retryable`: ugyanez a fotó egy újraküldéstől
 * még sikerülhet.
 */
export class VisionError extends Error {
	public constructor(
		message: string,
		public readonly retryable: boolean,
		options?: { cause?: unknown }
	) {
		super(message, options);
		this.name = 'VisionError';
	}
}

/** Egy fotó, egy séma szerinti JSON-válasz. */
export interface ImageJsonRequest {
	model: string;
	systemPrompt: string;
	prompt: string;
	photo: { data: string; mediaType: string };
	schema: ResponseSchema;
	maxTokens: number;
	/** A gyűjtőnek szóló üzenet, ha a hívás elakad. */
	failure: string;
}

/**
 * Múló hiba-e. A `STRUCTURED_OUTPUT_INVALID` kivétel, pedig 502: a modell
 * elzárkózott, vagy kifutott a keretből. Ugyanazon a modellen ez jellemzően
 * ismétlődik, és a hívást a gateway már kiszámlázta — újrapróbálni pénz,
 * nem esély.
 */
function isTransient(error: unknown): error is ZsAiError {
	return (
		error instanceof ZsAiError &&
		error.isTransient &&
		error.code !== 'STRUCTURED_OUTPUT_INVALID'
	);
}

function retryWait(error: ZsAiError): number {
	return Math.min((error.retryAfterSec ?? 0) * 1000, MAX_RETRY_WAIT_MS);
}

/**
 * A fotó elolvasása, a válasz már feldolgozott JSON-ként. Hibát nem nyel el:
 * minden kudarc `VisionError`, és a hívó dönti el, mit mond a gyűjtőnek.
 */
export async function readImageJson(
	client: VisionClient,
	request: ImageJsonRequest
): Promise<unknown> {
	const text = await complete(client, request).catch((error) => {
		if (error instanceof VisionError) throw error;
		if (
			error instanceof ZsAiError &&
			error.code === 'STRUCTURED_OUTPUT_INVALID'
		) {
			throw new VisionError(
				'A modell nem adott használható választ.',
				false,
				{ cause: error }
			);
		}

		throw new VisionError(request.failure, isTransient(error), {
			cause: error,
		});
	});

	try {
		return JSON.parse(text);
	} catch (error) {
		throw new VisionError('A modell válasza nem értelmezhető.', false, {
			cause: error,
		});
	}
}

async function complete(
	client: VisionClient,
	request: ImageJsonRequest
): Promise<string> {
	for (let attempt = 1; ; attempt++) {
		try {
			const result = await client.execute({
				capability: 'text.complete',
				input: {
					model: request.model,
					systemPrompt: request.systemPrompt,
					prompt: request.prompt,
					images: [
						{
							base64: request.photo.data,
							mimeType: request.photo.mediaType,
						},
					],
					responseSchema: request.schema,
					maxTokens: request.maxTokens,
				},
			});
			const text = result.kind === 'result' ? result.output?.text : null;

			if (!text) {
				throw new VisionError(
					'A modell nem adott szöveges választ.',
					false
				);
			}

			return text;
		} catch (error) {
			if (attempt >= MAX_ATTEMPTS || !isTransient(error)) throw error;

			await new Promise((resolve) =>
				setTimeout(resolve, retryWait(error))
			);
		}
	}
}
