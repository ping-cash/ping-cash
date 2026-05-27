import type { NavItem } from '../types';

// Mirrors Wise / Remitly / WorldRemit top-level nav structure:
// personal-vs-business split + help + log-in CTA.
export const navigation: NavItem[] = [
  { label: 'Send money', href: '/#send' },
  { label: 'Where you send', href: '/#countries' },
  { label: 'Fees', href: '/#fees' },
  { label: 'Help', href: '/help' },
  { label: 'About', href: '/about' },
];
