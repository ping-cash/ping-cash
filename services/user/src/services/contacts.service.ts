/**
 * Contact management.
 *
 * Users sync their phone contacts; we hash each phone and find which ones
 * are registered Ping users. Returns enriched contact list for the app UX.
 */
import { createHash } from 'node:crypto';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export interface ContactSyncInput {
  name: string;
  phones: string[]; // E.164 format
}

export interface ContactPublic {
  name: string | null;
  phoneMasked: string;
  isRegistered: boolean;
  avatarUrl: string | null;
  lastTransferAt: string | null;
  transferCount: number;
}

function hashPhone(phone: string): string {
  return createHash('sha256').update(phone).digest('hex');
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, -4) + ' ***' + phone.slice(-2);
}

/**
 * Sync user's contacts from phone book.
 * - Hashes each phone
 * - Looks up registered users
 * - Creates/updates contact records
 */
export async function sync(
  ownerUserId: string,
  contacts: ContactSyncInput[],
): Promise<{ syncedCount: number; registeredCount: number }> {
  let syncedCount = 0;
  let registeredCount = 0;

  for (const c of contacts) {
    for (const phone of c.phones) {
      const phoneHash = hashPhone(phone);

      // Check if registered as a Ping user
      const registeredUser = await prisma.user.findUnique({
        where: { phoneHash },
        select: { id: true },
      });

      const isRegistered = !!registeredUser;
      if (isRegistered) registeredCount++;

      await prisma.contact.upsert({
        where: {
          ownerUserId_contactPhoneHash: { ownerUserId, contactPhoneHash: phoneHash },
        },
        create: {
          ownerUserId,
          contactPhoneHash: phoneHash,
          contactPhoneMasked: maskPhone(phone),
          displayName: c.name,
          isRegistered,
          registeredUserId: registeredUser?.id,
        },
        update: {
          displayName: c.name,
          isRegistered,
          registeredUserId: registeredUser?.id,
        },
      });

      syncedCount++;
    }
  }

  logger.info({ ownerUserId, syncedCount, registeredCount }, 'Contacts synced');
  return { syncedCount, registeredCount };
}

/**
 * List contacts for a user, optionally filtered.
 */
export async function list(
  ownerUserId: string,
  options: { search?: string; registered?: boolean; limit?: number; cursor?: string } = {},
): Promise<{ contacts: ContactPublic[]; nextCursor: string | null }> {
  const { search, registered, limit = 50 } = options;

  const where: Record<string, unknown> = { ownerUserId };

  if (typeof registered === 'boolean') {
    where.isRegistered = registered;
  }
  if (search) {
    where.displayName = { contains: search, mode: 'insensitive' };
  }

  const items = await prisma.contact.findMany({
    where,
    orderBy: [{ lastTransferAt: 'desc' }, { displayName: 'asc' }],
    take: limit + 1, // Take one extra to know if there's a next cursor
  });

  const hasMore = items.length > limit;
  const contacts = items.slice(0, limit).map(toPublic);
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { contacts, nextCursor };
}

function toPublic(contact: {
  displayName: string | null;
  contactPhoneMasked: string;
  isRegistered: boolean;
  lastTransferAt: Date | null;
  transferCount: number;
}): ContactPublic {
  return {
    name: contact.displayName,
    phoneMasked: contact.contactPhoneMasked,
    isRegistered: contact.isRegistered,
    avatarUrl: null, // Phase 2: pull from registeredUser
    lastTransferAt: contact.lastTransferAt?.toISOString() ?? null,
    transferCount: contact.transferCount,
  };
}
