import { describe, it, expect } from 'vitest';

import { renderTemplate, listTemplates } from './templates.service';

describe('templates.service', () => {
  it('lists all templates', () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThan(0);
    expect(templates).toContain('TRANSFER_RECEIVED');
    expect(templates).toContain('CLAIM_REMINDER');
    expect(templates).toContain('WELCOME_STAKE_GRANTED');
  });

  it('renders TRANSFER_RECEIVED for whatsapp', () => {
    const result = renderTemplate('TRANSFER_RECEIVED', 'whatsapp', {
      amount: '$200',
      senderName: 'Ahmed',
      claimUrl: 'https://ping.cash/c/abc123',
    });
    expect(result.body).toContain('$200');
    expect(result.body).toContain('Ahmed');
    expect(result.body).toContain('ping.cash/c/abc123');
  });

  it('renders TRANSFER_RECEIVED for SMS (compact)', () => {
    const result = renderTemplate('TRANSFER_RECEIVED', 'sms', {
      amount: '$200',
      senderName: 'Ahmed',
      claimUrl: 'https://ping.cash/c/abc123',
    });
    expect(result.body.length).toBeLessThan(160); // SMS-friendly
    expect(result.body).toContain('Ahmed');
  });

  it('renders TRANSFER_RECEIVED for push (title + body)', () => {
    const result = renderTemplate('TRANSFER_RECEIVED', 'push', {
      amount: '$200',
      senderName: 'Ahmed',
      claimUrl: 'https://ping.cash/c/abc123',
    });
    expect(result.title).toBe('$200 received');
    expect(result.body).toContain('Ahmed');
  });

  it('renders WELCOME_STAKE_GRANTED with no params', () => {
    const result = renderTemplate('WELCOME_STAKE_GRANTED', 'whatsapp', {});
    expect(result.body).toContain('1,200 $PING');
    expect(result.body).toContain('Silver');
  });

  it('renders MILESTONE_UNLOCKED with params', () => {
    const result = renderTemplate('MILESTONE_UNLOCKED', 'whatsapp', {
      milestone: 'Refer 3 active users',
      newBalance: '400',
    });
    expect(result.body).toContain('200 $PING');
    expect(result.body).toContain('Refer 3 active users');
    expect(result.body).toContain('400');
  });

  it('renders AUTH_OTP with code', () => {
    const result = renderTemplate('AUTH_OTP', 'sms', { code: '425639' });
    expect(result.body).toContain('425639');
  });

  it('throws on unknown template', () => {
    expect(() => renderTemplate('NONEXISTENT' as never, 'sms', {})).toThrow(
      /Unknown template/
    );
  });

  it('renders SENDER_TRANSFER_CLAIMED (#81) for push with recipient name', () => {
    const result = renderTemplate('SENDER_TRANSFER_CLAIMED', 'push', {
      amount: '$50',
      recipientName: 'Joe',
      method: 'GCash',
    });
    expect(result.title).toContain('Joe');
    expect(result.title).toContain('$50');
    expect(result.body).toContain('GCash');
  });

  it('renders SENDER_TRANSFER_CLAIMED for SMS with recipient name', () => {
    const result = renderTemplate('SENDER_TRANSFER_CLAIMED', 'sms', {
      amount: '$50',
      recipientName: 'Joe',
    });
    expect(result.body).toContain('Joe');
    expect(result.body).toContain('$50');
  });

  it('SENDER_TRANSFER_CLAIMED falls back to recipientPhone when no name', () => {
    const result = renderTemplate('SENDER_TRANSFER_CLAIMED', 'push', {
      amount: '$50',
      recipientPhone: '+44770090012',
    });
    expect(result.title).toContain('+44770090012');
  });
});
