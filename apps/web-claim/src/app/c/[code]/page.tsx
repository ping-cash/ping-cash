/**
 * Claim flow — entry page at /c/<code>.
 *
 * Flow:
 *   1. Fetch claim metadata (sender, amount, expiry)
 *   2. User requests OTP → /claims/:code/otp
 *   3. User enters OTP → /claims/:code/verify → gets cashout methods
 *   4. User selects method + enters account → /claims/:code/cashout
 *   5. Success screen with reference number
 */
import { ClaimFlow } from '@/components/ClaimFlow';

export default function ClaimPage({ params }: { params: { code: string } }) {
  return <ClaimFlow code={params.code} />;
}
