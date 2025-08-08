import ExpoModulesCore
import UIKit
import AVFoundation
import CoreImage.CIFilterBuiltins
import CryptoKit

// MARK: - Data Extensions

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

// MARK: - Base45 Encoding

let base45Charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:")

func base45Encode(_ data: Data) -> String {
  var output = ""
  var i = 0
  while i < data.count {
    if i + 1 < data.count {
      let x = Int(data[i]) << 8 | Int(data[i + 1])
      output.append(base45Charset[x / (45 * 45)])
      output.append(base45Charset[(x / 45) % 45])
      output.append(base45Charset[x % 45])
      i += 2
    } else {
      let x = Int(data[i])
      output.append(base45Charset[x / 45])
      output.append(base45Charset[x % 45])
      i += 1
    }
  }
  return output
}

// MARK: - QRPayload Definition

enum QRPayload {
  case timeBased(time: Int, signer: P256.Signing.PrivateKey)
  case certBased(certID: String, time: Int, signer: P256.Signing.PrivateKey)
    case contentBased(contentID: String, time: Int, signer: P256.Signing.PrivateKey)
    case locationBased(geoHash: String, time: Int, signer: P256.Signing.PrivateKey)

  func generateMessage() throws -> String {
    switch self {
    case .timeBased(let time, let signer):
        let msg = String(time).uppercased()
      let signature = try signer.signature(for: msg.data(using: .utf8)!).rawRepresentation
      let encoded = base45Encode(signature)
      return "T:\(time):\(encoded)"

    case .certBased(let certID, let time, let signer):
        let msg = "\(certID)\(time)".uppercased()
      let signature = try signer.signature(for: msg.data(using: .utf8)!).rawRepresentation
      let encoded = base45Encode(signature)
      return "U:\(certID.uppercased()):\(encoded)"
        
    case .contentBased(let contentID, let time, let signer):
        let msg = "\(contentID)\(time)".uppercased()
      let signature = try signer.signature(for: msg.data(using: .utf8)!).rawRepresentation
      let encoded = base45Encode(signature)
      return "C:\(contentID.uppercased()):\(encoded)"
        
    case .locationBased(let geoHash, let time, let signer):
        let msg = "\(geoHash)\(time)".uppercased()
      let signature = try signer.signature(for: msg.data(using: .utf8)!).rawRepresentation
      let encoded = base45Encode(signature)
      return "L:\(geoHash.uppercased()):\(encoded)"
    }
  }
}

// MARK: - QR Layer Generator

func createQRLayer(from message: String, context: CIContext, position: CGPoint, size: CGSize) throws -> CALayer {
  let filter = CIFilter.qrCodeGenerator()
  guard let data = message.data(using: .utf8) else {
    throw NSError(domain: "AddSignature", code: 10, userInfo: [NSLocalizedDescriptionKey: "Invalid QR message"])
  }

  filter.setValue(data, forKey: "inputMessage")
  filter.setValue("L", forKey: "correctionLevel")

  guard let outputImage = filter.outputImage else {
    throw NSError(domain: "AddSignature", code: 11, userInfo: [NSLocalizedDescriptionKey: "Failed to generate QR code"])
  }

  let scaled = outputImage.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
  guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else {
    throw NSError(domain: "AddSignature", code: 12, userInfo: [NSLocalizedDescriptionKey: "Failed to render QR"])
  }

  let layer = CALayer()
  layer.contents = cgImage
  layer.magnificationFilter = .nearest
  layer.minificationFilter = .nearest
  layer.frame = CGRect(origin: position, size: size)
  layer.contentsGravity = .resizeAspectFill
  layer.opacity = 0
  return layer
}

// MARK: - Module Definition

public class AddSignatureModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AddSignature")

      AsyncFunction("addQROverlayToVideo") { (videoUrl: String, startTime: Int, privateKeyHex: String, certID: String, contentID: String, geoHash: String) -> String in

      func transformedVideoSize(for track: AVAssetTrack) -> CGSize {
        let t = track.preferredTransform
        let size = track.naturalSize
        return CGRect(origin: .zero, size: size).applying(t).standardized.size
      }

      func processVideo() async throws -> String {
        let url = URL(fileURLWithPath: videoUrl.replacingOccurrences(of: "file://", with: ""))
        let asset = AVAsset(url: url)

        guard let track = asset.tracks(withMediaType: .video).first else {
          throw NSError(domain: "AddSignature", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track found"])
        }

        let composition = AVMutableComposition()
        let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
        try videoTrack?.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: track, at: .zero)

        if let audioTrack = asset.tracks(withMediaType: .audio).first {
          let audioComp = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
          try audioComp?.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: audioTrack, at: .zero)
        }

        let context = CIContext()
        let privateKeyData = try Data(hex: privateKeyHex).unwrap("Invalid hex")
        let privateKey = try P256.Signing.PrivateKey(rawRepresentation: privateKeyData)

        let videoSize = transformedVideoSize(for: track)
        let interval = 3
        let duration = Int(CMTimeGetSeconds(asset.duration))
        let frames = duration / interval + 1

        let videoComposition = AVMutableVideoComposition()
        videoComposition.renderSize = videoSize
        videoComposition.frameDuration = CMTimeMake(value: 1, timescale: 30)

        let parentLayer = CALayer()
        let videoLayer = CALayer()
        parentLayer.frame = CGRect(origin: .zero, size: videoSize)
        videoLayer.frame = CGRect(origin: .zero, size: videoSize)
        parentLayer.addSublayer(videoLayer)

        let qrSize = CGSize(width: videoSize.width * 0.1, height: videoSize.width * 0.1)
        var allLayers: [CALayer] = []

        for i in 0..<frames {
          let currentTime = startTime + i * interval

          let topLeft = try createQRLayer(
            from: try QRPayload.timeBased(time: currentTime, signer: privateKey).generateMessage(),
            context: context,
            position: CGPoint(x: 20, y: 20 + qrSize.height),
            size: qrSize
          )
            
          let topCenter = try createQRLayer(
            from: try QRPayload.contentBased(contentID: contentID, time: currentTime, signer: privateKey).generateMessage(),
            context: context,
            position: CGPoint(x: 20 + qrSize.width, y: 20 + qrSize.height),
            size: qrSize
          )
            
            let topRight = try createQRLayer(
              from: try QRPayload.locationBased(geoHash: geoHash, time: currentTime, signer: privateKey).generateMessage(),
              context: context,
              position: CGPoint(x: 20 + 2 * qrSize.width, y: 20 + qrSize.height),
              size: qrSize
            )

          let bottom = try createQRLayer(
            from: try QRPayload.certBased(certID: certID, time: currentTime, signer: privateKey).generateMessage(),
            context: context,
            position: CGPoint(x: 20 + qrSize.width, y: 20),
            size: qrSize
          )

          [topLeft, topCenter, topRight, bottom].forEach { layer in
            parentLayer.addSublayer(layer)
            allLayers.append(layer)
          }

          let beginTime = CFTimeInterval(i * interval)
          [topLeft, topCenter, topRight, bottom].forEach {
            let anim = CAKeyframeAnimation(keyPath: "opacity")
            anim.values = [0, 1, 1, 0]
            anim.keyTimes = [0, 0.01, 0.99, 1]
            anim.duration = CFTimeInterval(frames * interval)
            anim.beginTime = AVCoreAnimationBeginTimeAtZero + beginTime
            anim.fillMode = .forwards
            anim.isRemovedOnCompletion = false
            $0.add(anim, forKey: "opacityAnimation")
          }
        }

        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)

        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = CMTimeRange(start: .zero, duration: asset.duration)

        let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack!)
        layerInstruction.setTransform(track.preferredTransform, at: .zero)

        instruction.layerInstructions = [layerInstruction]
        videoComposition.instructions = [instruction]

        let outputURL = FileManager.default.temporaryDirectory.appendingPathComponent("qrOverlay-\(UUID().uuidString).mp4")
        let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality)!
        exporter.outputURL = outputURL
        exporter.outputFileType = .mp4
        exporter.videoComposition = videoComposition

        return try await withCheckedThrowingContinuation { cont in
          exporter.exportAsynchronously {
            if let error = exporter.error {
              cont.resume(throwing: error)
            } else {
              cont.resume(returning: outputURL.path)
            }
          }
        }
      }

      return try await processVideo()
    }
  }
}

// MARK: - Helpers

extension Optional {
  func unwrap(_ msg: String) throws -> Wrapped {
    guard let value = self else {
      throw NSError(domain: "AddSignature", code: 100, userInfo: [NSLocalizedDescriptionKey: msg])
    }
    return value
  }
}
