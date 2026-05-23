import { logger } from '../utils/logger';

export interface ClaimBridgeInput {
  transferId: string;
  senderId: string;
  senderName?: string;
  recipientPhone: string;
  claimCode: string;
  amountValue: string;
  amountCurrency: string;
  localValue?: string;
  localCurrency?: string;
  fxRate?: number;
}

/**
 * Best-effort POST to claim-service /claims/internal/create.
 *
 * Failure modes deliberately swallowed: claim-service down at transfer-create time
 * should NOT block the transfer (transfer is already in the DB). A reconcile-loop
 * elsewhere will retry. Logging only.
 */
export async function createClaimForTransfer(
  input: ClaimBridgeInput,
  fetchImpl: typeof fetch = fetch
): Promise<{ code: string; url: string } | null> {
  const baseUrl = process.env.CLAIM_SERVICE_URL ?? '';
  if (!baseUrl) {
    logger.warn(
      { transferId: input.transferId },
      '[STUB] CLAIM_SERVICE_URL unset — skipping claim-service bridge'
    );
    return null;
  }

  const body = {
    transferId: input.transferId,
    senderId: input.senderId,
    senderName: input.senderName,
    recipientPhone: input.recipientPhone,
    claimCode: input.claimCode,
    amount: {
      value: input.amountValue,
      currency: input.amountCurrency,
      localValue: input.localValue,
      localCurrency: input.localCurrency,
      fxRate: input.fxRate,
    },
  };

  try {
    const res = await fetchImpl(
      `${baseUrl.replace(/\/$/, '')}/claims/internal/create`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      logger.error(
        { transferId: input.transferId, status: res.status },
        'claim-service /claims/internal/create non-2xx — transfer persisted but unclaimable until reconcile'
      );
      return null;
    }
    const data = (await res.json()) as { code?: string; url?: string };
    logger.info(
      { transferId: input.transferId, claimCode: data.code },
      'claim-service /claims/internal/create OK'
    );
    return { code: data.code ?? input.claimCode, url: data.url ?? '' };
  } catch (err) {
    logger.error(
      { err, transferId: input.transferId },
      'claim-service bridge failed — transfer persisted but unclaimable until reconcile'
    );
    return null;
  }
}
