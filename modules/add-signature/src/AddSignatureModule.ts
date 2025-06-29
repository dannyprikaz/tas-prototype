import { NativeModule, requireNativeModule } from 'expo';

import { AddSignatureModuleEvents } from './AddSignature.types';

declare class AddSignatureModule extends NativeModule<AddSignatureModuleEvents> {
  addQROverlayToVideo(videoUrl: string, text: string): Promise<string>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AddSignatureModule>('AddSignature');
