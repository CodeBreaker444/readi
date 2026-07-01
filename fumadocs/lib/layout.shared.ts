import type { HomeLayoutProps } from 'fumadocs-ui/layouts/home';

export const baseOptions = (): HomeLayoutProps => ({
  nav: {
    title: 'Readi Platform Documentation',
  },
  links: [
    {
      text: 'Docs',
      url: '/docs',
      active: 'nested-url' as const,
    },
  ],
});
