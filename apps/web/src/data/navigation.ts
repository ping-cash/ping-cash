import type { NavItem } from '../types';

export const navigation: NavItem[] = [
  {
    label: 'Products',
    href: '#',
    children: [
      { label: 'Nova Cloud', href: '/nova' },
      { label: 'Sovereign Cloud', href: '/sovereign' },
    ],
  },
  { label: 'Platform', href: '/platform' },
  { label: 'Engagement', href: '/engagement' },
  { label: 'Careers', href: '/careers' },
  { label: 'Exodus', href: '/exodus' },
  { label: 'Docs', href: '/docs' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];
