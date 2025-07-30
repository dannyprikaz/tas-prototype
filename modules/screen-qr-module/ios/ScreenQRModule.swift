import ExpoModulesCore
import ReplayKit

public class ScreenQRModule: Module {
    var foregroundObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ScreenQRModule")

    Events("onQRCodeDetected", "onError")

      AsyncFunction("startBroadcast") { () -> String in
        DispatchQueue.main.sync {
          let picker = RPSystemBroadcastPickerView(frame: CGRect(x: 0, y: 0, width: 50, height: 50))
          picker.preferredExtension = "com.dannyprikaz.tasprototype.TASBroadcastExtension"

          if let button = picker.subviews.first(where: { $0 is UIButton }) as? UIButton {
            button.sendActions(for: .allEvents)
          }
        }

        NSLog("Start Broadcast called")

        if let ud = UserDefaults(suiteName: "group.com.dannyprikaz.tasprototype") {
          ud.set([], forKey: "lastDetectedQRSet")
          ud.set(true, forKey: "broadcastAttempted")
        }

        // ✅ Set up observer for foreground event
        self.foregroundObserver = NotificationCenter.default.addObserver(
          forName: UIApplication.willEnterForegroundNotification,
          object: nil,
          queue: .main
        ) { [weak self] _ in
          guard let self = self else { return }

          self.checkForDetectedQR()

          // ✅ Remove observer after firing
          if let observer = self.foregroundObserver {
            NotificationCenter.default.removeObserver(observer)
            self.foregroundObserver = nil
          }
        }

        return "started"
      }



      OnDestroy {
        if let observer = self.foregroundObserver {
          NotificationCenter.default.removeObserver(observer)
        }
      }
  }
    
    private func checkForDetectedQR() {
      NSLog("App entered foreground, checking for QR data")

      if let ud = UserDefaults(suiteName: "group.com.dannyprikaz.tasprototype") {
        let attempted = ud.bool(forKey: "broadcastAttempted")
        if attempted,
           let detected = ud.array(forKey: "lastDetectedQRSet") as? [String],
           !detected.isEmpty {

          NSLog("✅ Detected QR codes on foreground: \(detected)")
          self.sendEvent("onQRCodeDetected", ["value": detected])

          ud.removeObject(forKey: "lastDetectedQRSet")
          ud.removeObject(forKey: "broadcastAttempted")
        } else {
          NSLog("⏳ No QR codes or broadcast not attempted")
        }
      }
    }

}
