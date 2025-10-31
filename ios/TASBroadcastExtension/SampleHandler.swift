import ReplayKit
import Vision
import CoreImage

class SampleHandler: RPBroadcastSampleHandler {
  
  override init() {
      super.init()
      NSLog("🚀🚀🚀 BROADCAST EXTENSION INITIALIZED 🚀🚀🚀")
      NSLog("🚀 Bundle ID: \(Bundle.main.bundleIdentifier ?? "unknown")")
  }

  override func broadcastStarted(withSetupInfo setupInfo: [String : NSObject]?) {
      NSLog("🎬 BROADCAST STARTED")
      NSLog("🎬 Setup Info: \(String(describing: setupInfo))")
  }
  
  // MARK: - Dynamic App Group Configuration
  
  /// Returns the appropriate app group identifier based on the extension's bundle ID
  private var appGroupIdentifier: String {
    let bundleId = Bundle.main.bundleIdentifier ?? ""
    
    // Extract base bundle ID by removing the extension suffix
    let baseBundleId: String
    if bundleId.contains(".TASBroadcastExtension") {
      baseBundleId = bundleId.replacingOccurrences(of: ".TASBroadcastExtension", with: "")
    } else {
      baseBundleId = bundleId
    }
    
    let appGroup = "group.\(baseBundleId)"
    print("📦 Using app group: \(appGroup)")
    return appGroup
  }
  
  lazy var qrRequest: VNDetectBarcodesRequest = {
    let request = VNDetectBarcodesRequest { request, error in
      guard let results = request.results as? [VNBarcodeObservation] else { return }

      var seenPrefixes = Set<String>()
      var currentFrameMessages = [String]()

      for qr in results {
        guard let msg = qr.payloadStringValue else { continue }

        currentFrameMessages.append(msg)

        // NEW FORMAT: Check first character only (no delimiters)
        // Format: T{timestamp}, I{certID}, C{contentID}, L{len}{geohash}
        if msg.count > 0 {
          let prefix = String(msg.prefix(1))
          
          switch prefix {
          case "T":
            seenPrefixes.insert("T")
          case "I":
            seenPrefixes.insert("I")
          case "C":
            seenPrefixes.insert("C")
          case "L":
            seenPrefixes.insert("L")
          default:
            // Backward compatibility: check for old format with colons
            if msg.hasPrefix("T:") {
              seenPrefixes.insert("T")
            } else if msg.hasPrefix("U:") {
              // Old "U" (User) maps to new "I" (Identity)
              seenPrefixes.insert("I")
            } else if msg.hasPrefix("C:") {
              seenPrefixes.insert("C")
            } else if msg.hasPrefix("L:") {
              seenPrefixes.insert("L")
            }
          }
        }
      }

      // Log detection progress
      if !seenPrefixes.isEmpty {
        print("📱 Screen capture detected \(seenPrefixes.count)/4 QR codes: \(seenPrefixes)")
      }

      // Check if we have all 4 required prefixes
      if seenPrefixes.count == 4 {
        print("✅ All 4 QR codes detected, stopping broadcast")
        self.stopBroadcasting(with: currentFrameMessages)
      }
    }

    request.symbologies = [.qr]
    return request
  }()

  
  var lastAnalysisTime = CFAbsoluteTimeGetCurrent()
  let analysisInterval: CFTimeInterval = 0.2  // Analyze 5 frames per second

  override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
    guard sampleBufferType == .video else { return }

    let now = CFAbsoluteTimeGetCurrent()
    if now - lastAnalysisTime >= analysisInterval {
      lastAnalysisTime = now
    } else {
      return
    }

    processFrameBuffer(sampleBuffer)
  }

  func processFrameBuffer(_ sampleBuffer: CMSampleBuffer) {
    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

    let fullImage = CIImage(cvPixelBuffer: pixelBuffer)
    let width = fullImage.extent.width
    let height = fullImage.extent.height

    // ROI targeting the T-shaped QR code layout
    // Adjust based on your actual QR positioning
    let roiRect = CGRect(
        x: 0,
        y: 0,
        width: width * 0.4,
        height: height * 0.25
    )

    let croppedImage = fullImage.cropped(to: roiRect)

    var croppedPixelBuffer: CVPixelBuffer?
    let attrs: [String: Any] = [
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
    ]

    CVPixelBufferCreate(
        kCFAllocatorDefault,
        Int(roiRect.width),
        Int(roiRect.height),
        kCVPixelFormatType_32BGRA,
        attrs as CFDictionary,
        &croppedPixelBuffer
    )

    guard let outputBuffer = croppedPixelBuffer else { return }

    let context = CIContext()
    context.render(croppedImage, to: outputBuffer)

    let requestHandler = VNImageRequestHandler(cvPixelBuffer: outputBuffer, orientation: .up, options: [:])

    try? requestHandler.perform([self.qrRequest])
  }

  func stopBroadcasting(with messages: [String]) {
      NSLog("🔴 BROADCAST: Attempting to stop and save QR data")
      NSLog("🔴 BROADCAST: App Group: \(appGroupIdentifier)")
      NSLog("🔴 BROADCAST: Messages: \(messages)")
      
      // Use dynamic app group identifier
      if let ud = UserDefaults(suiteName: appGroupIdentifier) {
          ud.setValue(messages, forKey: "lastDetectedQRSet")
          ud.setValue(true, forKey: "broadcastAttempted")
          ud.synchronize() // Force write
          
          NSLog("💾 BROADCAST: Successfully saved to UserDefaults")
          
          // Verify it was written
          if let readBack = ud.array(forKey: "lastDetectedQRSet") as? [String] {
              NSLog("✅ BROADCAST: Verified write - read back: \(readBack)")
          } else {
              NSLog("❌ BROADCAST: Failed to read back data!")
          }
      } else {
          NSLog("❌ BROADCAST: Failed to access UserDefaults with app group: \(appGroupIdentifier)")
      }

      finishBroadcastWithError(NSError(
          domain: "QRDetected",
          code: 0,
          userInfo: [NSLocalizedDescriptionKey: "All QR codes detected (T, I, C, L)"]
      ))
  }
}
