import ExpoModulesCore
import UIKit
import AVFoundation

public class AddSignatureModule: Module {
  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
    public func definition() -> ModuleDefinition {
            // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
            // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
            // The module will be accessible from `requireNativeModule('AddSignature')` in JavaScript.
            Name("AddSignature")
            
            // Defines event names that the module can send to JavaScript.
            Events("onChange")
            
            // Defines a JavaScript function that always returns a Promise and whose native code
            // is by default dispatched on the different thread than the JavaScript runtime runs on.
            AsyncFunction("addTextOverlayToVideo") { (videoUrl: String, text: String) -> String in
                
                func transformedVideoSize(for track: AVAssetTrack) -> CGSize {
                    let t = track.preferredTransform
                    let naturalSize = track.naturalSize
                    let transformedRect = CGRect(origin: .zero, size: naturalSize).applying(t)
                    return CGSize(width: abs(transformedRect.width), height: abs(transformedRect.height))
                }

                
                func processVideoWithTextOverlay(videoUrl: String, text: String) async throws -> String {
                    let inputURL = videoUrl.hasPrefix("file://")
                      ? URL(fileURLWithPath: String(videoUrl.dropFirst("file://".count)))
                      : URL(fileURLWithPath: videoUrl)

                    
                    // Create AVAsset and AVComposition
                    let asset = AVAsset(url: inputURL)
                    let composition = AVMutableComposition()
                    guard let videoTrack = asset.tracks(withMediaType: .video).first else {
                        throw NSError(domain: "MyVideoModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track found"])
                    }
                    
                    let videoCompositionTrack = composition.addMutableTrack(
                        withMediaType: .video,
                        preferredTrackID: kCMPersistentTrackID_Invalid
                    )
                    
                    try videoCompositionTrack?.insertTimeRange(
                        CMTimeRange(start: .zero, duration: asset.duration),
                        of: videoTrack,
                        at: .zero
                    )
                    
                    if let audioTrack = asset.tracks(withMediaType: .audio).first {
                        let compositionAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
                        try compositionAudioTrack?.insertTimeRange(
                            CMTimeRange(start: .zero, duration: asset.duration),
                            of: audioTrack,
                            at: .zero
                        )
                    }

                    
                    // Create a video composition
                    let videoSize = transformedVideoSize(for: videoTrack)
                    let videoComposition = AVMutableVideoComposition()
                    videoComposition.renderSize = videoSize
                    videoComposition.frameDuration = CMTimeMake(value: 1, timescale: 30)
                    
                    // Create parent layer
                    let parentLayer = CALayer()
                    let videoLayer = CALayer()
                    parentLayer.frame = CGRect(origin: .zero, size: videoSize)
                    videoLayer.frame = CGRect(origin: .zero, size: videoSize)
                    parentLayer.addSublayer(videoLayer)
                    
                    // Create text overlay
                    let titleLayer = CATextLayer()
                    titleLayer.string = text
                    titleLayer.font = UIFont.systemFont(ofSize: 36)
                    titleLayer.alignmentMode = .center
                    titleLayer.foregroundColor = UIColor.white.cgColor
                    titleLayer.frame = CGRect(x: 0, y: videoSize.height / 2, width: videoSize.width, height: 100)
                    titleLayer.isWrapped = true
                    parentLayer.addSublayer(titleLayer)
                    
                    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
                        postProcessingAsVideoLayer: videoLayer,
                        in: parentLayer
                    )
                    
                    // Instruction
                    let instruction = AVMutableVideoCompositionInstruction()
                    instruction.timeRange = CMTimeRange(start: .zero, duration: asset.duration)
                    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoCompositionTrack!)
                    layerInstruction.setTransform(videoTrack.preferredTransform, at: .zero)
                    instruction.layerInstructions = [layerInstruction]
                    videoComposition.instructions = [instruction]
                    
                    // Export
                    let outputURL = FileManager.default.temporaryDirectory.appendingPathComponent("overlayedVideo-\(UUID().uuidString).mp4")
                    guard let exportSession = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
                        throw NSError(domain: "MyVideoModule", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not create export session"])
                    }
                    
                    exportSession.outputURL = outputURL
                    exportSession.outputFileType = .mp4
                    exportSession.videoComposition = videoComposition
                    
                    let path: String = try await withCheckedThrowingContinuation { continuation in
                        exportSession.exportAsynchronously {
                            if let error = exportSession.error {
                                continuation.resume(throwing: error)
                            } else {
                                continuation.resume(returning: outputURL.path)
                            }
                        }
                    }
                    
                    return path
                }
                return try await processVideoWithTextOverlay(videoUrl: videoUrl, text: text)
            }
  }
}
