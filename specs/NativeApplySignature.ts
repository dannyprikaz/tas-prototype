import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  applySignature(video: string, signature: string): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeApplySignature',
);