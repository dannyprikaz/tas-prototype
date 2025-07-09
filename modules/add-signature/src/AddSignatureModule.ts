import { NativeModule, requireNativeModule } from 'expo';

import { AddSignatureModuleEvents } from './AddSignature.types';

declare class AddSignatureModule extends NativeModule<AddSignatureModuleEvents> {
  addQROverlayToVideo(videoUrl: string, startTime: number, privateKeyHex: string,
    certID: string, contentID: string, geoHash: string): Promise<string>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AddSignatureModule>('AddSignature');
