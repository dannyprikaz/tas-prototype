import ExpoModulesCore
import UIKit
import AVFoundation
import CoreImage.CIFilterBuiltins
import CryptoKit

extension Data {
  init?(hex: String) {
    let len = hex.count / 2
    var data = Data(capacity: len)
    var index = hex.startIndex
    for _ in 0..<len {
      let nextIndex = hex.index(index, offsetBy: 2)
      guard nextIndex <= hex.endIndex else { return nil }
      if let b = UInt8(hex[index..<nextIndex], radix: 16) {
        data.append(b)
      } else {
        return nil
      }
      index = nextIndex
    }
    self = data
  }

  func base64URLEncodedString() -> String {
    return self.base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }
}

public class AddSignatureModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AddSignature")
    Events("onChange")

    AsyncFunction("addQROverlayToVideo") { (videoUrl: String, startTime: Int, privateKeyHex: String, certID: String) -> String in
      
      func transformedVideoSize(for track: AVAssetTrack) -> CGSize {
        let t = track.preferredTransform
        let naturalSize = track.naturalSize
        let transformedRect = CGRect(origin: .zero, size: naturalSize).applying(t)
        return CGSize(width: abs(transformedRect.width), height: abs(transformedRect.height))
      }

      func processVideoWithTextOverlay(videoUrl: String, startTime: Int, privateKeyHex: String, certID: String) async throws -> String {
        let inputURL = videoUrl.hasPrefix("file://")
          ? URL(fileURLWithPath: String(videoUrl.dropFirst("file://".count)))
          : URL(fileURLWithPath: videoUrl)

        guard let privateKeyData = Data(hex: privateKeyHex) else {
          throw NSError(domain: "AddSignature", code: 5, userInfo: [NSLocalizedDescriptionKey: "Invalid private key hex"])
        }

        let privateKey = try P256.Signing.PrivateKey(rawRepresentation: privateKeyData)

        // Load video and tracks
        let asset = AVAsset(url: inputURL)
        let composition = AVMutableComposition()
        guard let videoTrack = asset.tracks(withMediaType: .video).first else {
          throw NSError(domain: "AddSignature", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track found"])
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
          let compositionAudioTrack = composition.addMutableTrack(
            withMediaType: .audio,
            preferredTrackID: kCMPersistentTrackID_Invalid
          )
          try compositionAudioTrack?.insertTimeRange(
            CMTimeRange(start: .zero, duration: asset.duration),
            of: audioTrack,
            at: .zero
          )
        }

        // Video size and composition
        let videoSize = transformedVideoSize(for: videoTrack)
        let videoComposition = AVMutableVideoComposition()
        videoComposition.renderSize = videoSize
        videoComposition.frameDuration = CMTimeMake(value: 1, timescale: 30)

        // Parent and video layers
        let parentLayer = CALayer()
        let videoLayer = CALayer()
        parentLayer.frame = CGRect(origin: .zero, size: videoSize)
        videoLayer.frame = CGRect(origin: .zero, size: videoSize)
        parentLayer.addSublayer(videoLayer)

        // Calculate intervals for 3-second QR changes
        let intervalSeconds = 3
        let totalDurationSeconds = Int(CMTimeGetSeconds(asset.duration))
        let intervalsCount = totalDurationSeconds / intervalSeconds + 1

        let context = CIContext()

        var leftQRLayers: [CALayer] = []
        var rightQRLayers: [CALayer] = []

        let qrSizeMultiplier: CGFloat = 0.25 // 25% of video width
        let qrWidth = videoSize.width * qrSizeMultiplier
        let qrHeight = qrWidth

        for i in 0..<intervalsCount {
          let currentTime = startTime + i * intervalSeconds

          // --- Left QR (TAS-time) ---
          let leftSignature = try privateKey.signature(
            for: String(currentTime).data(using: .utf8)!
          ).derRepresentation.base64URLEncodedString()
          let leftMessage = "TAS-time:\(currentTime)::\(leftSignature)"
            

          guard let leftData = leftMessage.data(using: .utf8) else {
            throw NSError(domain: "AddSignature", code: 6, userInfo: [NSLocalizedDescriptionKey: "Invalid left QR message data"])
          }

          let leftFilter = CIFilter.qrCodeGenerator()
          leftFilter.setValue(leftData, forKey: "inputMessage")
          leftFilter.setValue("L", forKey: "correctionLevel")

          guard let leftOutputImage = leftFilter.outputImage else {
            throw NSError(domain: "AddSignature", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to generate left QR code"])
          }

          let leftTransformed = leftOutputImage.transformed(by: CGAffineTransform(scaleX: qrWidth / leftOutputImage.extent.size.width, y: qrHeight / leftOutputImage.extent.size.height))

          guard let leftCGImage = context.createCGImage(leftTransformed, from: leftTransformed.extent) else {
            throw NSError(domain: "AddSignature", code: 4, userInfo: [NSLocalizedDescriptionKey: "Failed to render left QR code"])
          }

          let leftLayer = CALayer()
          leftLayer.contents = leftCGImage
          leftLayer.frame = CGRect(x: 20, y: 20, width: qrWidth, height: qrHeight)
          leftLayer.contentsGravity = .resizeAspectFill
          leftLayer.opacity = 0
          parentLayer.addSublayer(leftLayer)
          leftQRLayers.append(leftLayer)

          // --- Right QR (TAS-cert) ---
          let certMessageData = "\(certID)\(currentTime)".data(using: .utf8)!
          let certSignature = try privateKey.signature(for: certMessageData).derRepresentation.base64URLEncodedString()
          let rightMessage = "TAS-cert:\(certID)::\(certSignature)"

          guard let rightData = rightMessage.data(using: .utf8) else {
            throw NSError(domain: "AddSignature", code: 7, userInfo: [NSLocalizedDescriptionKey: "Invalid right QR message data"])
          }

          let rightFilter = CIFilter.qrCodeGenerator()
          rightFilter.setValue(rightData, forKey: "inputMessage")
          rightFilter.setValue("L", forKey: "correctionLevel")

          guard let rightOutputImage = rightFilter.outputImage else {
            throw NSError(domain: "AddSignature", code: 8, userInfo: [NSLocalizedDescriptionKey: "Failed to generate right QR code"])
          }

          let rightTransformed = rightOutputImage.transformed(by: CGAffineTransform(scaleX: qrWidth / rightOutputImage.extent.size.width, y: qrHeight / rightOutputImage.extent.size.height))

          guard let rightCGImage = context.createCGImage(rightTransformed, from: rightTransformed.extent) else {
            throw NSError(domain: "AddSignature", code: 9, userInfo: [NSLocalizedDescriptionKey: "Failed to render right QR code"])
          }

          let rightLayer = CALayer()
          rightLayer.contents = rightCGImage
          rightLayer.frame = CGRect(x: 40 + qrWidth, y: 20, width: qrWidth, height: qrHeight) // positioned right to left QR with 20pt gap
          rightLayer.contentsGravity = .resizeAspectFill
          rightLayer.opacity = 0
          parentLayer.addSublayer(rightLayer)
          rightQRLayers.append(rightLayer)
        }

        // Animate all QR layers opacity for the sequential 3-second intervals
        let totalAnimationDuration = CFTimeInterval(intervalsCount * intervalSeconds)

        func addOpacityAnimation(to layer: CALayer, beginTime: CFTimeInterval) {
          let animation = CAKeyframeAnimation(keyPath: "opacity")
          animation.values = [0, 1, 1, 0]
          animation.keyTimes = [0, 0.01, 0.99, 1] as [NSNumber]
          animation.duration = totalAnimationDuration
          animation.beginTime = AVCoreAnimationBeginTimeAtZero + beginTime
          animation.isRemovedOnCompletion = false
          animation.fillMode = .forwards
          animation.repeatCount = 1
          layer.add(animation, forKey: "opacityAnimation")
        }

        for i in 0..<intervalsCount {
          let beginTime = CFTimeInterval(i * intervalSeconds)
          addOpacityAnimation(to: leftQRLayers[i], beginTime: beginTime)
          addOpacityAnimation(to: rightQRLayers[i], beginTime: beginTime)
        }

        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)

        // Video composition instructions
        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = CMTimeRange(start: .zero, duration: asset.duration)
        let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoCompositionTrack!)
        layerInstruction.setTransform(videoTrack.preferredTransform, at: .zero)
        instruction.layerInstructions = [layerInstruction]
        videoComposition.instructions = [instruction]

        // Export video
        let outputURL = FileManager.default.temporaryDirectory.appendingPathComponent("overlayedVideo-\(UUID().uuidString).mp4")
        guard let exportSession = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
          throw NSError(domain: "AddSignature", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not create export session"])
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

      return try await processVideoWithTextOverlay(videoUrl: videoUrl, startTime: startTime, privateKeyHex: privateKeyHex, certID: certID)
    }
  }
}
