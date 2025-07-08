import ReplayKit
import Vision
import CoreImage

class SampleHandler: RPBroadcastSampleHandler {

  let ciContext = CIContext()
  let qrRequest = VNDetectBarcodesRequest()
  var lastDetected: String?

  override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
    guard sampleBufferType == .video,
          let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
      return
    }

    let requestHandler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
    do {
      try requestHandler.perform([qrRequest])
      if let results = qrRequest.results,
         let first = results.first,
         let payload = first.payloadStringValue {

        if payload != lastDetected {
          lastDetected = payload
          let defaults = UserDefaults(suiteName: "group.com.dannyprikaz.tasprototype")
          defaults?.set(payload, forKey: "lastDetectedQR")
          defaults?.synchronize()

          finishBroadcastWithError(NSError(domain: "QRDetected", code: 0, userInfo: [NSLocalizedDescriptionKey: "QR code found"]))
        }
      }
    } catch {
      print("QR detection failed: \(error)")
    }
  }
}
