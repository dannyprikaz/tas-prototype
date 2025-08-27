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

// MARK: - QR Layer Generator (Conservative Version)

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

      print("=== AddSignature Module Called ===")
      print("videoUrl: \(videoUrl)")
      print("startTime: \(startTime)")
      print("privateKeyHex length: \(privateKeyHex.count)")
      print("certID: \(certID)")
      print("contentID: \(contentID)")
      print("geoHash: \(geoHash)")

      func transformedVideoSize(for track: AVAssetTrack) -> CGSize {
        let t = track.preferredTransform
        let size = track.naturalSize
        return CGRect(origin: .zero, size: size).applying(t).standardized.size
      }

      func processVideo() async throws -> String {
        print("Starting video processing...")
        
        let url = URL(fileURLWithPath: videoUrl.replacingOccurrences(of: "file://", with: ""))
        print("Video URL: \(url)")
        
        let asset = AVAsset(url: url)
        print("Asset created")

        guard let track = asset.tracks(withMediaType: .video).first else {
          print("❌ No video track found")
          throw NSError(domain: "AddSignature", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track found"])
        }
        print("✓ Video track found")

        let composition = AVMutableComposition()
        let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
        try videoTrack?.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: track, at: .zero)
        print("✓ Video track added to composition")

        if let audioTrack = asset.tracks(withMediaType: .audio).first {
          let audioComp = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
          try audioComp?.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: audioTrack, at: .zero)
          print("✓ Audio track added to composition")
        }

        print("Creating CIContext...")
        let context = CIContext()
        
        print("Parsing private key...")
        guard let privateKeyData = Data(hex: privateKeyHex) else {
          print("❌ Invalid private key hex")
          throw NSError(domain: "AddSignature", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid private key hex"])
        }
        
        print("Creating P256 private key...")
        let privateKey: P256.Signing.PrivateKey
        do {
          privateKey = try P256.Signing.PrivateKey(rawRepresentation: privateKeyData)
          print("✓ Private key created successfully")
        } catch {
          print("❌ Failed to create private key: \(error)")
          throw NSError(domain: "AddSignature", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to create private key: \(error.localizedDescription)"])
        }

        let videoSize = transformedVideoSize(for: track)
        print("Video size: \(videoSize)")
        
        let interval = 3
        let duration = Int(CMTimeGetSeconds(asset.duration))
        let frames = duration / interval + 1
        print("Duration: \(duration)s, Frames: \(frames), Interval: \(interval)s")
        
        // Limit frames for very long videos to prevent crashes
        let maxFrames = 200 // Limit to ~10 minutes max
        let actualFrames = min(frames, maxFrames)
        if frames > maxFrames {
          print("⚠️ Video too long, limiting to \(actualFrames) frames")
        }

        let videoComposition = AVMutableVideoComposition()
        videoComposition.renderSize = videoSize
        videoComposition.frameDuration = CMTimeMake(value: 1, timescale: 30)

        let parentLayer = CALayer()
        let videoLayer = CALayer()
        parentLayer.frame = CGRect(origin: .zero, size: videoSize)
        videoLayer.frame = CGRect(origin: .zero, size: videoSize)
        parentLayer.addSublayer(videoLayer)

        let qrSize = CGSize(width: videoSize.width * 0.1, height: videoSize.width * 0.1)
        print("QR size: \(qrSize)")

        print("Generating QR layers...")
        for i in 0..<actualFrames {
          let currentTime = startTime + i * interval
          
          if i % 10 == 0 {
            print("Processing frame \(i)/\(actualFrames)")
          }

          do {
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
            }

            let beginTime = CFTimeInterval(i * interval)
            [topLeft, topCenter, topRight, bottom].forEach { layer in
              let anim = CAKeyframeAnimation(keyPath: "opacity")
              anim.values = [0, 1, 1, 0]
              anim.keyTimes = [0, 0.01, 0.99, 1]
              anim.duration = CFTimeInterval(actualFrames * interval)
              anim.beginTime = AVCoreAnimationBeginTimeAtZero + beginTime
              anim.fillMode = .forwards
              anim.isRemovedOnCompletion = false
              layer.add(anim, forKey: "opacityAnimation_\(i)")
            }
          } catch {
            print("❌ Error creating QR layer at frame \(i): \(error)")
            throw error
          }
        }

        print("✓ All QR layers created successfully")

        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)

        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = CMTimeRange(start: .zero, duration: asset.duration)

        let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack!)
        layerInstruction.setTransform(track.preferredTransform, at: .zero)

        instruction.layerInstructions = [layerInstruction]
        videoComposition.instructions = [instruction]

        let outputURL = FileManager.default.temporaryDirectory.appendingPathComponent("qrOverlay-\(UUID().uuidString).mp4")
        print("Output URL: \(outputURL)")
        
        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
          print("❌ Failed to create export session")
          throw NSError(domain: "AddSignature", code: 4, userInfo: [NSLocalizedDescriptionKey: "Failed to create export session"])
        }
        
        exporter.outputURL = outputURL
        exporter.outputFileType = .mp4
        exporter.videoComposition = videoComposition
        
        print("Starting export...")

        return try await withCheckedThrowingContinuation { cont in
          exporter.exportAsynchronously {
            if let error = exporter.error {
              print("❌ Export failed: \(error)")
              cont.resume(throwing: error)
            } else {
              print("✓ Export completed successfully")
              cont.resume(returning: outputURL.path)
            }
          }
        }
      }

      do {
        return try await processVideo()
      } catch {
        print("❌ Fatal error in addQROverlayToVideo: \(error)")
        throw error
      }
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
