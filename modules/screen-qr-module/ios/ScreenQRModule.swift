import ExpoModulesCore
import ReplayKit

public class ScreenQRModule: Module {
  var timer: Timer?

  public func definition() -> ModuleDefinition {
    Name("ScreenQRModule")

    Events("onQRCodeDetected", "onError")

      AsyncFunction("startBroadcast") { () -> String in
        // Run everything UIKit-related on the main thread:
        DispatchQueue.main.sync {
          let picker = RPSystemBroadcastPickerView(frame: CGRect(x: 0, y: 0, width: 50, height: 50))
          picker.preferredExtension = "com.dannyprikaz.tasprototype.TASBroadcastExtension"

          if let button = picker.subviews.first(where: { $0 is UIButton }) as? UIButton {
            // Trigger the button programmatically:
            button.sendActions(for: .allEvents)
          }
        }

        startPolling()
        return "started"
      }


    Function("stopPolling") {
      self.timer?.invalidate()
      self.timer = nil
    }
  }

  private func startPolling() {
    timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
      let defaults = UserDefaults(suiteName: "group.com.dannyprikaz.tasprototype")
      if let detected = defaults?.string(forKey: "lastDetectedQR") {
        self?.sendEvent("onQRCodeDetected", [
          "value": detected
        ])
        defaults?.removeObject(forKey: "lastDetectedQR")
        self?.timer?.invalidate()
        self?.timer = nil
      }
    }
  }
}
