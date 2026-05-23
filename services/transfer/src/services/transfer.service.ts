import { constants, getConfig } from '@ping/config';
import type {
  Transfer,
  TransferStatus,
  TransferSummary,
  Currency,
  PaginationResult,
} from '@ping/types';
import { EventTypes } from '@ping/types/events';
import {
  generateId,
  generateClaimCode,
  hashPhone,
  now,
  addDuration,
} from '@ping/utils';

import { publishEvent } from '../events/producer';
import { TransferRepository } from '../repositories/transfer.repository';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

import {
  ensureKycForTransfer,
  KycTierInsufficientError,
} from './kyc-check.service';
import { lookupRecipientUserId } from './recipient-lookup.service';

interface CreateTransferInput {
  senderId: string;
  recipientPhone: string;
  amount: string;
  currency: Currency;
  note?: string;
}

interface ListTransfersInput {
  type?: 'sent' | 'received';
  status?: string;
  limit?: number;
  cursor?: string;
}

export class TransferService {
  private repository: TransferRepository;

  constructor() {
    this.repository = new TransferRepository();
  }

  async createTransfer(input: CreateTransferInput): Promise<Transfer> {
    const config = getConfig();

    // KYC tier check per ADR 0011 — refuses early if user can't legally transact at this amount
    try {
      await ensureKycForTransfer(input.senderId, Number(input.amount));
    } catch (err) {
      if (err instanceof KycTierInsufficientError) {
        throw new AppError('KYC_TIER_INSUFFICIENT', err.message, 403, {
          currentTier: err.currentTier,
          requiredTier: err.requiredTier,
        });
      }
      throw err;
    }

    const transferId = generateId.transfer();
    const claimCode = generateClaimCode();
    const recipientPhoneHash = hashPhone(input.recipientPhone);
    const claimExpiresAt = addDuration(
      new Date(),
      `${constants.CLAIM_EXPIRY_DAYS}d`
    ).toISOString();
    const claimUrl = `${config.CLAIM_URL}/${claimCode}`;

    logger.info(
      {
        transferId,
        senderId: input.senderId,
        recipientPhone: input.recipientPhone.slice(0, 6) + '***',
        amount: input.amount,
        currency: input.currency,
      },
      'Creating transfer'
    );

    // Best-effort lookup: if recipient phone matches an existing user, link them.
    const recipientUserId = await lookupRecipientUserId(recipientPhoneHash);

    // Create transfer record
    const transfer = await this.repository.create({
      id: transferId,
      senderId: input.senderId,
      recipientPhone: input.recipientPhone,
      recipientPhoneHash,
      recipientUserId: recipientUserId ?? undefined,
      amount: input.amount,
      currency: input.currency,
      status: 'pending',
      claimCode,
      claimUrl,
      claimExpiresAt,
      note: input.note,
    });

    // Publish event for saga orchestration
    await publishEvent(EventTypes.TRANSFER_INITIATED, {
      transferId: transfer.id,
      senderId: transfer.senderId,
      recipientPhone: transfer.recipientPhone,
      amount: transfer.amount.amount,
      currency: transfer.amount.currency,
      note: transfer.note,
    });

    logger.info({ transferId }, 'Transfer created and event published');

    return transfer;
  }

  async getTransfer(id: string, userId: string): Promise<Transfer | null> {
    const transfer = await this.repository.findById(id);

    if (!transfer) {
      return null;
    }

    // Check authorization
    if (transfer.senderId !== userId && transfer.recipientUserId !== userId) {
      throw new AppError(
        'FORBIDDEN',
        'Not authorized to view this transfer',
        403
      );
    }

    return transfer;
  }

  async listTransfers(
    userId: string,
    options: ListTransfersInput
  ): Promise<{ transfers: TransferSummary[]; pagination: PaginationResult }> {
    const limit = options.limit || constants.DEFAULT_PAGE_SIZE;

    const { transfers } = await this.repository.findByUser(userId, {
      type: options.type,
      status: options.status as TransferStatus,
      limit: limit + 1, // Fetch one extra to determine hasMore
      cursor: options.cursor,
    });

    // Check if there are more results
    const actualHasMore = transfers.length > limit;
    const actualTransfers = actualHasMore
      ? transfers.slice(0, limit)
      : transfers;

    return {
      transfers: actualTransfers,
      pagination: {
        hasMore: actualHasMore,
        nextCursor: actualHasMore
          ? actualTransfers[actualTransfers.length - 1].id
          : undefined,
      },
    };
  }

  async cancelTransfer(id: string, userId: string): Promise<Transfer> {
    const transfer = await this.repository.findById(id);

    if (!transfer) {
      throw new AppError('TRANSFER_NOT_FOUND', 'Transfer not found', 404);
    }

    if (transfer.senderId !== userId) {
      throw new AppError(
        'FORBIDDEN',
        'Not authorized to cancel this transfer',
        403
      );
    }

    // Can only cancel pending or confirmed (unclaimed) transfers
    if (!['pending', 'confirmed'].includes(transfer.status)) {
      throw new AppError(
        'INVALID_STATUS',
        `Cannot cancel transfer in status: ${transfer.status}`,
        400
      );
    }

    logger.info({ transferId: id, userId }, 'Cancelling transfer');

    // Update status
    const updatedTransfer = await this.repository.updateStatus(id, 'cancelled');

    // Publish cancellation event (will trigger refund in wallet service)
    await publishEvent(EventTypes.TRANSFER_CANCELLED, {
      transferId: id,
      reason: 'user_cancelled',
      cancelledAt: now(),
    });

    return updatedTransfer;
  }

  async updateTransferStatus(
    id: string,
    status: TransferStatus
  ): Promise<Transfer> {
    return this.repository.updateStatus(id, status);
  }

  async markTransferConfirmed(
    id: string,
    chain: string,
    txHash: string
  ): Promise<Transfer> {
    const transfer = await this.repository.findById(id);

    if (!transfer) {
      throw new AppError('TRANSFER_NOT_FOUND', 'Transfer not found', 404);
    }

    const updatedTransfer = await this.repository.update(id, {
      status: 'confirmed',
      blockchain: {
        chain: chain as any,
        txHash,
        confirmedAt: now(),
      },
    });

    await publishEvent(EventTypes.TRANSFER_CONFIRMED, {
      transferId: id,
      chain,
      txHash,
      confirmedAt: now(),
    });

    return updatedTransfer;
  }

  async markTransferClaimed(id: string, claimId: string): Promise<Transfer> {
    const transfer = await this.repository.updateStatus(id, 'claimed');

    await publishEvent(EventTypes.TRANSFER_CLAIMED, {
      transferId: id,
      claimId,
      recipientPhone: transfer.recipientPhone,
      claimedAt: now(),
    });

    return transfer;
  }

  async markTransferCompleted(
    id: string,
    cashoutId: string
  ): Promise<Transfer> {
    const transfer = await this.repository.updateStatus(id, 'completed');

    await publishEvent(EventTypes.TRANSFER_COMPLETED, {
      transferId: id,
      cashoutId,
      completedAt: now(),
    });

    return transfer;
  }
}
