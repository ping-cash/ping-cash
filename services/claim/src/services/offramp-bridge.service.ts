import { logger } from '../utils/logger';

export interface OfframpBridgeInput {
  reference: string;
  method: string;
  amount: {
    usdcAmount: string;
    localAmount: string;
    localCurrency: string;
  };
  recipient: {
    phone?: string;
    name?: string;
    accountNumber?: string;
    accountName?: string;
  };
}

/**
 * Best-effort POST to offramp-service /offramp/payout.
 *
 * Mirrors the transfer→claim bridge pattern from ping-cash#40: failure does NOT
 * roll back the claim (recipient sees their reference). A reconcile-loop in
 * offramp-service polls Redis for claims with cashout selected but no payout
 * recorded; behaviour TBD when Kafka lands. For now: synchronous best-effort.
 */
export async function dispatchToOfframp(
  input: OfframpBridgeInput,
  fetchImpl: typeof fetch = fetch
): Promise<{ providerName: string; providerReference: string } | null> {
  const baseUrl = process.env.OFFRAMP_SERVICE_URL ?? '';
  if (!baseUrl) {
    logger.warn(
      { reference: input.reference },
      '[STUB] OFFRAMP_SERVICE_URL unset — skipping offramp bridge'
    );
    return null;
  }

  try {
    const res = await fetchImpl(
      `${baseUrl.replace(/\/$/, '')}/offramp/payout`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }
    );
    if (!res.ok) {
      logger.error(
        { reference: input.reference, status: res.status },
        'offramp /payout non-2xx — claim recorded but payout queue empty until reconcile'
      );
      return null;
    }
    const data = (await res.json()) as {
      providerName?: string;
      providerReference?: string;
    };
    logger.info(
      {
        reference: input.reference,
        providerName: data.providerName,
        providerReference: data.providerReference,
      },
      'offramp /payout OK'
    );
    return {
      providerName: data.providerName ?? 'unknown',
      providerReference: data.providerReference ?? input.reference,
    };
  } catch (err) {
    logger.error(
      { err, reference: input.reference },
      'offramp /payout failed — claim recorded but payout queue empty until reconcile'
    );
    return null;
  }
}
