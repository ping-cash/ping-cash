'use client';

import { useEffect, useState } from 'react';

import {
  getClaim,
  requestOtp,
  verifyOtp,
  executeCashout,
  type ClaimPublic,
  type CashoutMethod,
} from '@/lib/api';

type Stage =
  | 'loading'
  | 'view'
  | 'otp'
  | 'methods'
  | 'account'
  | 'success'
  | 'error';

export function ClaimFlow({ code }: { code: string }) {
  const [stage, setStage] = useState<Stage>('loading');
  const [claim, setClaim] = useState<ClaimPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [methods, setMethods] = useState<CashoutMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [account, setAccount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getClaim(code);
        if (cancelled) return;
        setClaim(result);
        setStage('view');
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
        setStage('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleRequestOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestOtp(code);
      setStage('otp');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setError('Please enter the 6-digit code');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await verifyOtp(code, otpCode);
      setMethods(result.cashoutMethods);
      setStage('methods');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSelectMethod = (method: string) => {
    setSelectedMethod(method);
    setStage('account');
  };

  const handleSubmitAccount = async () => {
    if (!selectedMethod || !account) {
      setError('Please enter your account details');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await executeCashout({
        code,
        method: selectedMethod,
        account,
        accountName: accountName || undefined,
      });
      setReference(result.offrampReference);
      setStage('success');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (stage === 'loading') {
    return (
      <div className="claim-card">
        <p>Loading...</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="claim-card">
        <h2>Couldn't load claim</h2>
        <p className="error">{error}</p>
        <p className="helper">
          The link may have expired or already been used. If the sender resends,
          the new link will work.
        </p>
      </div>
    );
  }

  if (!claim) return null;

  // Stage: view — show claim details + "Continue to claim" button
  if (stage === 'view') {
    return (
      <>
        <ProgressDots step={1} />
        <div className="claim-card">
          <p className="claim-from">
            {claim.sender.name ?? 'Someone'} sent you
          </p>
          <p className="claim-amount">
            ${claim.amount.value} {claim.amount.currency}
          </p>
          {claim.amount.localValue ? (
            <p className="claim-local">
              ≈ {claim.amount.localValue} {claim.amount.localCurrency}
            </p>
          ) : null}
          <p className="claim-expires">
            <span className="expiry-dot" /> Expires in{' '}
            {Math.floor(claim.expiresIn / 3600)}h{' '}
            {Math.floor((claim.expiresIn % 3600) / 60)}m
          </p>
        </div>

        <div className="trust-pills">
          <span className="trust-pill">
            <span className="trust-icon">⚡</span> Instant
          </span>
          <span className="trust-pill">
            <span className="trust-icon">🔒</span> Secure
          </span>
          <span className="trust-pill">
            <span className="trust-icon">💸</span> No fees to claim
          </span>
        </div>

        <div className="section-spacing">
          <button className="button" onClick={handleRequestOtp} disabled={busy}>
            {busy ? 'Sending code...' : `Continue to claim →`}
          </button>
          <p className="helper center">
            We'll send a 6-digit code to {claim.recipientPhoneMasked}
          </p>
          {error ? <p className="error">{error}</p> : null}
        </div>
      </>
    );
  }

  // Stage: otp — enter the 6-digit code
  if (stage === 'otp') {
    return (
      <>
        <ProgressDots step={2} />
        <div className="claim-card">
          <p>Enter the code we sent to {claim.recipientPhoneMasked}</p>
        </div>

        <div className="section-spacing">
          <label className="label">Verification code</label>
          <input
            className="input otp-input"
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={otpCode}
            onChange={e =>
              setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            autoFocus
          />
          <button
            className="button section-spacing"
            onClick={handleVerifyOtp}
            disabled={busy || otpCode.length !== 6}
          >
            {busy ? 'Verifying...' : 'Verify'}
          </button>
          {error ? <p className="error">{error}</p> : null}
          <p className="helper center">
            Didn&apos;t get a code?{' '}
            <button
              type="button"
              className="link-button"
              onClick={handleRequestOtp}
              disabled={busy}
            >
              Send it again
            </button>
          </p>
        </div>
      </>
    );
  }

  // Stage: methods — choose cash-out method
  if (stage === 'methods') {
    return (
      <>
        <ProgressDots step={3} />
        <div className="claim-card">
          <p>Choose how you want to receive</p>
          <p
            style={{
              color: 'var(--accent)',
              fontSize: 28,
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            ${claim.amount.value} {claim.amount.currency}
          </p>
        </div>

        <div className="method-list">
          {methods.map(m => (
            <button
              key={m.method}
              type="button"
              className="method-card"
              onClick={() => handleSelectMethod(m.method)}
            >
              <div>
                <div className="method-name">{methodLabel(m.method)}</div>
                <div className="method-meta">{m.estimatedTime}</div>
              </div>
              <div className="method-fee">{m.fee}</div>
            </button>
          ))}
        </div>
      </>
    );
  }

  // Stage: account — enter account details for the selected method
  if (stage === 'account') {
    return (
      <>
        <ProgressDots step={4} />
        <div className="claim-card">
          <p>
            Send to your{' '}
            <strong style={{ color: 'var(--accent)' }}>
              {methodLabel(selectedMethod ?? '')}
            </strong>
          </p>
        </div>

        <div className="section-spacing">
          <label className="label">Account number / phone</label>
          <input
            className="input"
            placeholder={getAccountPlaceholder(selectedMethod ?? '')}
            value={account}
            onChange={e => setAccount(e.target.value)}
            autoFocus
          />
          <p className="helper">{getAccountHelper(selectedMethod ?? '')}</p>

          <label className="label section-spacing">
            Account holder name (optional)
          </label>
          <input
            className="input"
            placeholder="Full name"
            value={accountName}
            onChange={e => setAccountName(e.target.value)}
          />

          <button
            className="button section-spacing"
            onClick={handleSubmitAccount}
            disabled={busy || !account}
          >
            {busy
              ? 'Sending...'
              : `Send ${claim.amount.value} ${claim.amount.currency} →`}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </div>
      </>
    );
  }

  // Stage: success
  return (
    <>
      <ProgressDots step={5} />
      <div className="claim-card success-card">
        <div className="success-check" aria-hidden>
          ✓
        </div>
        <h2 style={{ marginBottom: 8, fontSize: 28 }}>You&apos;re paid</h2>
        <p style={{ marginBottom: 16 }}>
          {claim.amount.localValue ?? claim.amount.value}{' '}
          {claim.amount.localCurrency ?? claim.amount.currency} is on its way to
          your {methodLabel(selectedMethod ?? '')}.
        </p>
        {reference ? (
          <p className="helper">
            Reference: <code>{reference}</code>
          </p>
        ) : null}
      </div>

      <div className="section-spacing">
        <a
          href="https://ping.cash/app"
          className="button center"
          style={{ display: 'block', textDecoration: 'none' }}
        >
          Get the Ping app for free transfers →
        </a>
        <p className="helper center">
          Sign up with this phone and get 1,200 $PING as a welcome bonus
        </p>
      </div>
    </>
  );
}

function ProgressDots({ step }: { step: 1 | 2 | 3 | 4 | 5 }) {
  const total = 5;
  return (
    <div
      className="progress-dots"
      aria-label={`Step ${step} of ${total}`}
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={
            i + 1 < step
              ? 'progress-dot done'
              : i + 1 === step
                ? 'progress-dot active'
                : 'progress-dot'
          }
        />
      ))}
    </div>
  );
}

function methodLabel(method: string): string {
  // Friendly capitalized labels — "gcash" → "GCash", "bdo-bank" → "BDO Bank".
  if (!method) return '';
  const specials: Record<string, string> = {
    gcash: 'GCash',
    maya: 'Maya',
    upi: 'UPI',
    'bdo-bank': 'BDO Bank',
    'cebuana-cash-pickup': 'Cebuana Cash Pickup',
    jazzcash: 'JazzCash',
    easypaisa: 'EasyPaisa',
    bkash: 'bKash',
    nagad: 'Nagad',
    'm-pesa': 'M-Pesa',
  };
  if (specials[method]) return specials[method];
  return method
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getAccountPlaceholder(method: string): string {
  if (method.includes('gcash') || method.includes('maya'))
    return '+63 9XX XXX XXXX';
  if (method.includes('upi')) return 'username@bankname';
  if (method.includes('jazzcash') || method.includes('easypaisa'))
    return '+92 3XX XXXXXXX';
  if (method.includes('bkash') || method.includes('nagad'))
    return '+880 1XXX XXXXXX';
  if (method.includes('m-pesa')) return '+254 7XX XXX XXX';
  if (method.includes('bank')) return 'Account number or IBAN';
  return 'Account number';
}

function getAccountHelper(method: string): string {
  if (method.includes('gcash') || method.includes('maya'))
    return 'Your GCash/Maya registered mobile number';
  if (method.includes('upi')) return 'Your UPI VPA (e.g. john@oksbi)';
  if (method.includes('bank')) return 'Account number or IBAN';
  return '';
}
