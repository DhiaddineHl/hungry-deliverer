// Lets TypeScript treat `.svg` imports as React components, matching the
// react-native-svg-transformer Metro setup in metro.config.js.
declare module '*.svg' {
  import type * as React from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}
