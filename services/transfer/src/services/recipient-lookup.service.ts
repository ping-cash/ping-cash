import { logger } from '../utils/logger';

export async function lookupRecipientUserId(
  phoneHash: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  const userServiceUrl = process.env.USER_SERVICE_URL ?? '';
  if (!userServiceUrl) {
    logger.warn(
      { phoneHash: phoneHash.slice(0, 8) + '...' },
      '[STUB] USER_SERVICE_URL unset — skipping recipient lookup'
    );
    return null;
  }

  try {
    const res = await fetchImpl(
      `${userServiceUrl.replace(/\/$/, '')}/users/internal/by-phone-hash/${encodeURIComponent(
        phoneHash
      )}`,
      { headers: { accept: 'application/json' } }
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      logger.warn(
        { status: res.status },
        'recipient lookup non-OK — treating as unregistered'
      );
      return null;
    }
    const body = (await res.json()) as { userId?: string };
    return body.userId ?? null;
  } catch (err) {
    logger.error({ err }, 'recipient lookup failed — treating as unregistered');
    return null;
  }
}
