import ReplayKit
import Vision
import CoreImage

class SampleHandler: RPBroadcastSampleHandler {
  lazy var qrRequest: VNDetectBarcodesRequest = {
    let request = VNDetectBarcodesRequest { request, error in
      guard let results = request.results as? [VNBarcodeObservation] else { return }

      var seenPrefixes = Set<String>()
      var currentFrameMessages = [String]()

      for qr in results {
        guard let msg = qr.payloadStringValue else { continue }

        currentFrameMessages.append(msg)

        if msg.hasPrefix("T:") {
          seenPrefixes.insert("T:")
        } else if msg.hasPrefix("U:") {
          seenPrefixes.insert("U:")
        } else if msg.hasPrefix("C:") {
          seenPrefixes.insert("C:")
        } else if msg.hasPrefix("L:") {
          seenPrefixes.insert("L:")
        }
      }

      if seenPrefixes.count == 4 {
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
    // Send to shared app group
    if let ud = UserDefaults(suiteName: "group.com.dannyprikaz.tasprototype") {
      ud.setValue(messages, forKey: "lastDetectedQRSet")
    }

    finishBroadcastWithError(NSError(
      domain: "QRDetected",
      code: 0,
      userInfo: [NSLocalizedDescriptionKey: "All QR codes detected (T, U, C, L)"]
    ))
  }
}
