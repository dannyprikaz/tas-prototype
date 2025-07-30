import ReplayKit
import Vision
import CoreImage

class SampleHandler: RPBroadcastSampleHandler {
  lazy var qrRequest: VNDetectBarcodesRequest = {
    let request = VNDetectBarcodesRequest { request, error in
      self.handleBarcodes(request.results, error: error)
    }
    request.symbologies = [.qr]
    return request
  }()
  var lastAnalysisTime = CFAbsoluteTimeGetCurrent()
  let analysisInterval: CFTimeInterval = 0.2  // Analyze 5 frames per second

  var foundMessages = Set<String>()

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

      // Convert the pixel buffer to a CIImage
      let fullImage = CIImage(cvPixelBuffer: pixelBuffer)
      let width = fullImage.extent.width
      let height = fullImage.extent.height

      // Define region of interest (top-left 25%)
      let roiRect = CGRect(
          x: 0,
          y: 0,
          width: width * 0.4,
          height: height * 0.25
      )

      let croppedImage = fullImage.cropped(to: roiRect)

      // Convert cropped image back to a pixel buffer
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


  func handleBarcodes(_ results: [Any]?, error: Error?) {
    guard let results = results as? [VNBarcodeObservation] else { return }

    var seenPrefixes = Set<String>()

    for qr in results {
      guard let msg = qr.payloadStringValue else { continue }

      if msg.hasPrefix("T:") {
        seenPrefixes.insert("T:")
      } else if msg.hasPrefix("U:") {
        seenPrefixes.insert("U:")
      } else if msg.hasPrefix("C:") {
        seenPrefixes.insert("C:")
      } else if msg.hasPrefix("L:") {
        seenPrefixes.insert("L:")
      }

      // Optionally store all messages (if needed elsewhere)
      foundMessages.insert(msg)
    }

    // Stop only if all 4 prefixes have been seen
    if seenPrefixes.count == 4 {
      stopBroadcasting()
    }
  }



  func stopBroadcasting() {
    // Send group notification for TAS app
    if let ud = UserDefaults(suiteName: "group.com.dannyprikaz.tasprototype") {
      ud.setValue(Array(foundMessages), forKey: "lastDetectedQRSet")
    }

    foundMessages.removeAll()

    finishBroadcastWithError(NSError(
      domain: "QRDetected",
      code: 0,
      userInfo: [NSLocalizedDescriptionKey: "All QR codes detected (T, U, C, L)"]
    ))
  }


}
