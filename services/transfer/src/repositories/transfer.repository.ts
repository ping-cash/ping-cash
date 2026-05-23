import type {
  Transfer,
  TransferStatus,
  TransferSummary,
  Chain,
} from '@ping/types';

import { prisma } from '../utils/prisma';

interface CreateTransferInput {
  id: string;
  senderId: string;
  recipientPhone: string;
  recipientPhoneHash: string;
  recipientUserId?: string;
  amount: string;
  currency: string;
  status: TransferStatus;
  claimCode: string;
  claimUrl: string;
  claimExpiresAt: string;
  note?: string;
}

interface UpdateTransferInput {
  status?: TransferStatus;
  recipientUserId?: string;
  blockchain?: {
    chain: Chain;
    txHash: string;
    confirmedAt: string;
  };
  cashout?: {
    method: string;
    localAmount: string;
    localCurrency: string;
    reference?: string;
    completedAt?: string;
  };
}

interface FindByUserOptions {
  type?: 'sent' | 'received';
  status?: TransferStatus;
  limit: number;
  cursor?: string;
}

export class TransferRepository {
  async create(input: CreateTransferInput): Promise<Transfer> {
    const transfer = await prisma.transfer.create({
      data: {
        id: input.id,
        senderId: input.senderId,
        recipientPhone: input.recipientPhone,
        recipientPhoneHash: input.recipientPhoneHash,
        recipientUserId: input.recipientUserId,
        amount: input.amount,
        currency: input.currency,
        status: input.status,
        claimCode: input.claimCode,
        claimUrl: input.claimUrl,
        claimExpiresAt: new Date(input.claimExpiresAt),
        note: input.note,
        version: 1,
      },
    });

    return this.mapToTransfer(transfer);
  }

  async findById(id: string): Promise<Transfer | null> {
    const transfer = await prisma.transfer.findUnique({
      where: { id },
    });

    if (!transfer) return null;

    return this.mapToTransfer(transfer);
  }

  async findByClaimCode(claimCode: string): Promise<Transfer | null> {
    const transfer = await prisma.transfer.findUnique({
      where: { claimCode },
    });

    if (!transfer) return null;

    return this.mapToTransfer(transfer);
  }

  async findByUser(
    userId: string,
    options: FindByUserOptions
  ): Promise<{
    transfers: TransferSummary[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const where: any = {};

    if (options.type === 'sent') {
      where.senderId = userId;
    } else if (options.type === 'received') {
      where.recipientUserId = userId;
    } else {
      where.OR = [{ senderId: userId }, { recipientUserId: userId }];
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.cursor) {
      where.id = { lt: options.cursor };
    }

    const transfers = await prisma.transfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit,
    });

    return {
      transfers: transfers.map(t => this.mapToSummary(t, userId)),
      hasMore: transfers.length === options.limit,
      nextCursor:
        transfers.length > 0 ? transfers[transfers.length - 1].id : undefined,
    };
  }

  async update(id: string, input: UpdateTransferInput): Promise<Transfer> {
    const transfer = await prisma.transfer.update({
      where: { id },
      data: {
        status: input.status,
        recipientUserId: input.recipientUserId,
        blockchainChain: input.blockchain?.chain,
        blockchainTxHash: input.blockchain?.txHash,
        blockchainConfirmedAt: input.blockchain?.confirmedAt
          ? new Date(input.blockchain.confirmedAt)
          : undefined,
        cashoutMethod: input.cashout?.method,
        cashoutLocalAmount: input.cashout?.localAmount,
        cashoutLocalCurrency: input.cashout?.localCurrency,
        cashoutReference: input.cashout?.reference,
        cashoutCompletedAt: input.cashout?.completedAt
          ? new Date(input.cashout.completedAt)
          : undefined,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });

    return this.mapToTransfer(transfer);
  }

  async updateStatus(id: string, status: TransferStatus): Promise<Transfer> {
    return this.update(id, { status });
  }

  async updateWithOptimisticLock(
    id: string,
    expectedVersion: number,
    input: UpdateTransferInput
  ): Promise<Transfer> {
    const result = await prisma.transfer.updateMany({
      where: {
        id,
        version: expectedVersion,
      },
      data: {
        status: input.status,
        recipientUserId: input.recipientUserId,
        updatedAt: new Date(),
        version: expectedVersion + 1,
      },
    });

    if (result.count === 0) {
      throw new Error('Optimistic lock failed - transfer was modified');
    }

    return this.findById(id) as Promise<Transfer>;
  }

  private mapToTransfer(record: any): Transfer {
    return {
      id: record.id,
      senderId: record.senderId,
      recipientPhone: record.recipientPhone,
      recipientPhoneHash: record.recipientPhoneHash,
      recipientUserId: record.recipientUserId || undefined,
      amount: {
        amount: record.amount,
        currency: record.currency,
      },
      fees: {
        amount: record.feeAmount || '0.00',
        currency: record.currency,
      },
      status: record.status,
      claimCode: record.claimCode,
      claimUrl: record.claimUrl,
      claimExpiresAt: record.claimExpiresAt.toISOString(),
      blockchain: record.blockchainChain
        ? {
            chain: record.blockchainChain,
            txHash: record.blockchainTxHash,
            confirmedAt: record.blockchainConfirmedAt?.toISOString(),
          }
        : undefined,
      cashout: record.cashoutMethod
        ? {
            method: record.cashoutMethod,
            localAmount: record.cashoutLocalAmount,
            localCurrency: record.cashoutLocalCurrency,
            reference: record.cashoutReference,
            completedAt: record.cashoutCompletedAt?.toISOString(),
          }
        : undefined,
      note: record.note || undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private mapToSummary(record: any, userId: string): TransferSummary {
    return {
      id: record.id,
      type: record.senderId === userId ? 'sent' : 'received',
      recipientPhone:
        record.senderId === userId ? record.recipientPhone : undefined,
      senderPhone: record.senderId !== userId ? record.senderPhone : undefined,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
