//
//  NativeApplySignature.swift
//  tasprototype
//
//  Created by Daniel Prikazsky on 5/28/25.
//

import UIKit
import Photos

@objcMembers class NativeApplySignature:NSObject {
  
  let fileManager = FileManager.default
  
  func applySignature(video:String,signature: String, completion: @escaping(String) -> Void) {
    Task {
      do {
        if let updatedurl = try await overlaySignatureOnVideo(to: URL(string: video)!, signature: signature) {
          completion("\(updatedurl)")
        }
      } catch {
          completion("")
      }
    }
  }
  
  func overlaySignatureOnVideo(to videoUrl: URL,signature: String) async throws -> URL? {
    let mixComposition = AVMutableComposition()
    let videoAsset = AVURLAsset(url: videoUrl, options: nil)
    
    guard let videoTrack = mixComposition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
      print("Failed to create video composition track")
      return nil
    }
    
    guard let audioTrack = mixComposition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
      print("Failed to create audio composition track")
      return nil
    }
    let duration = try await videoAsset.load(.duration)
    
    do {
      guard let assetVideoTrack = try await videoAsset.loadTracks(withMediaType: .video).first else {
        print("Failed to load track")
        return nil
      }
      
      guard let assetAudioTrack = try await videoAsset.loadTracks(withMediaType: .audio).first else {
        return nil
      }
      
      let timeRange = CMTimeRangeMake(start: .zero, duration: duration)
      try videoTrack.insertTimeRange(timeRange, of: assetVideoTrack, at: .zero)
      try audioTrack.insertTimeRange(timeRange, of: assetAudioTrack, at: .zero)
    } catch {
      print("Failed to load vido track: \(error)")
      return nil
    }
    
    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize = videoTrack.naturalSize
    videoComposition.frameDuration = CMTimeMake(value: 1, timescale: 30)
    
    let parentLayer = CALayer()
    let videoLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: videoTrack.naturalSize)
    videoLayer.frame = CGRect(origin: .zero, size: videoTrack.naturalSize)
    parentLayer.addSublayer(videoLayer)
    
    let signatureLayer = CATextLayer()
    signatureLayer.backgroundColor = UIColor.clear.cgColor
    signatureLayer.foregroundColor = UIColor.white.cgColor
    signatureLayer.string = signature
    signatureLayer.fontSize = 50
    signatureLayer.shadowOpacity = 0.5
    signatureLayer.alignmentMode = CATextLayerAlignmentMode.center
    signatureLayer.frame = CGRect(x: 0, y: (videoTrack.naturalSize.height-50)/2, width: videoTrack.naturalSize.width, height: 60)
    signatureLayer.shouldRasterize = true
    parentLayer.addSublayer(signatureLayer)
    
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)
    
    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRangeMake(start: .zero, duration: duration)
    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
    instruction.layerInstructions = [layerInstruction]
    videoComposition.instructions = [instruction]
    
    let exportPath = String(format: "%@%@", NSTemporaryDirectory(), "my.mp4")
    let exportUrl = URL(fileURLWithPath: exportPath)
    
    if fileManager.fileExists(atPath: exportPath) {
      try fileManager.removeItem(atPath: exportPath)
    }
    
    guard let exportSession = AVAssetExportSession(asset: mixComposition, presetName: AVAssetExportPresetHighestQuality) else { return nil }
    
    exportSession.videoComposition = videoComposition
    exportSession.shouldOptimizeForNetworkUse = true
    
    
    try await exportSession.export(to: exportUrl, as: .mp4)
    for try await state in exportSession.states(updateInterval: 1) {
      print("Export state updated: \(state)")
      switch state {
      case .waiting:
        print("Export is waiting to start.")
        // Update UI to show waiting state or prepare for export
      case .exporting(let progress):
        print("Export in progress.\(progress)")
        // You might want to update a progress bar here
      case .pending:
        print("export has pending.")
        // Finalize UI or perform post-export tasks
      default:
        print("Unknown state encountered.")
      }
    }
    
    return exportUrl
    
    
  }
}
