//
//  RCTNativeApplySignature.m
//  tasprototype
//
//  Created by Daniel Prikazsky on 5/28/25.
//

#import "RCTNativeApplySignature.h"
#import "tasprototype-Swift.h"

@interface RCTNativeApplySignature()
@end

@implementation RCTNativeApplySignature

RCT_EXPORT_MODULE(NativeApplySignautre)

NativeApplySignature *nativeApplySignautre = [[NativeApplySignature alloc] init];

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeApplySignatureSpecJSI>(params);
}

- (void)applySignature:(nonnull NSString *)video signature:(nonnull NSString *)signature resolve:(nonnull RCTPromiseResolveBlock)resolve reject:(nonnull RCTPromiseRejectBlock)reject{
  dispatch_async(dispatch_get_main_queue(), ^{
    
    [nativeApplySignautre applySignatureWithVideo:video signature:signature completion:^(NSString * _Nonnull result) {
      if (result && ![result isEqualToString:@""]) {
        resolve(result);
      } else {
        NSError *error = [NSError errorWithDomain:@"VideoOverlayError" code:500 userInfo:@{NSLocalizedDescriptionKey: @"Overlay operation failed or returned empty result."}];
        reject(@"overlay_error", @"Overlay operation failed or returned empty result.", error);
      }
    }];
  });
}

@end
