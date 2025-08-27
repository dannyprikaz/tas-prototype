import { NativeModule, requireNativeModule } from 'expo';

import { ScreenQRModuleEvents } from './ScreenQRModule.types';

declare class ScreenQRModule extends NativeModule<ScreenQRModuleEvents> {
  startBroadcast(): Promise<string>;
  stopPolling(): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ScreenQRModule>('ScreenQRModule');
