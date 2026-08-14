import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-themes'],
  framework: { name: '@storybook/nextjs', options: {} },
  staticDirs: ['../public'],
  docs: {},
  typescript: {
    // Fast Babel-based docgen. `react-docgen-typescript` does full TS type analysis and hangs on
    // our type graph (augmented styled-components DefaultTheme, generic components, lucide types).
    reactDocgen: 'react-docgen',
  },
};

export default config;
