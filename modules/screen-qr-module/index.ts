// Reexport the native module. On web, it will be resolved to ScreenQRModule.web.ts
// and on native platforms to ScreenQRModule.ts
export { default } from './src/ScreenQRModule';
export * from  './src/ScreenQRModule.types';
