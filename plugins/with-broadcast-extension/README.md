# withBroadcastExtension Expo Config Plugin

This document explains the implementation details and fixes required to make the `withBroadcastExtension` plugin correctly include iOS Broadcast Upload Extensions in the Expo build.

## Overview

The plugin adds two app extensions to the iOS build:
- **TASBroadcastExtension** - The main broadcast upload extension (ReplayKit)
- **TASBroadcastExtensionSetupUI** - The setup UI extension for the broadcast

## Key Implementation Challenges

### Problem 1: Extension Targets Created Without Source Files

**Issue**: When using the xcode project library's `addTarget()` function with `app_extension` type, it creates a target with an empty `buildPhases` array. The Swift source files were not being compiled, resulting in `.appex` bundles that contained only `Info.plist` files but no executable binary.

**Symptom**: `CommandError: APIInternalError` when trying to install the app on a device, because the extensions had no compiled code.

**Solution**: Create a custom `addSourceFilesToTarget()` function that:

1. Creates a new `PBXSourcesBuildPhase` for the extension target
2. Links it to the target's `buildPhases` array
3. Creates `PBXFileReference` entries for each Swift source file
4. Creates `PBXBuildFile` entries linking file references to the build phase
5. Adds the build file references to the Sources build phase's `files` array

```javascript
function addSourceFilesToTarget(xcodeProject, targetUuid, extensionName, sourceFiles) {
  const nativeTargets = xcodeProject.pbxNativeTargetSection();
  const target = nativeTargets[targetUuid];

  // Initialize buildPhases if empty
  if (!target.buildPhases) {
    target.buildPhases = [];
  }

  const objects = xcodeProject.hash.project.objects;

  // Create PBXSourcesBuildPhase
  const sourcesBuildPhaseUuid = xcodeProject.generateUuid();
  objects["PBXSourcesBuildPhase"][sourcesBuildPhaseUuid] = {
    isa: "PBXSourcesBuildPhase",
    buildActionMask: 2147483647,
    files: [],
    runOnlyForDeploymentPostprocessing: 0,
  };

  // Link to target's buildPhases
  target.buildPhases.push({
    value: sourcesBuildPhaseUuid,
    comment: "Sources",
  });

  // Add each source file
  for (const sourceFile of sourceFiles) {
    // Create file reference with correct path
    const fileRefUuid = xcodeProject.generateUuid();
    const filePath = `${extensionName}/${sourceFile}`;

    objects["PBXFileReference"][fileRefUuid] = {
      isa: "PBXFileReference",
      lastKnownFileType: "sourcecode.swift",
      path: filePath,
      sourceTree: '"<group>"',
      name: sourceFile,
    };

    // Create build file
    const buildFileUuid = xcodeProject.generateUuid();
    objects["PBXBuildFile"][buildFileUuid] = {
      isa: "PBXBuildFile",
      fileRef: fileRefUuid,
    };

    // Add to Sources build phase
    objects["PBXSourcesBuildPhase"][sourcesBuildPhaseUuid].files.push({
      value: buildFileUuid,
      comment: `${sourceFile} in Sources`,
    });
  }
}
```

### Problem 2: Incorrect File Paths in Build

**Issue**: File references were created with just the filename (e.g., `SampleHandler.swift`) but Xcode expected the path relative to the project root (e.g., `TASBroadcastExtension/SampleHandler.swift`).

**Symptom**: Build error: `Build input file cannot be found: '/path/to/ios/SampleHandler.swift'`

**Solution**: Include the extension folder name in the file path:

```javascript
const filePath = `${extensionName}/${sourceFile}`;
fileRefs[fileRefUuid] = {
  path: filePath,  // e.g., "TASBroadcastExtension/SampleHandler.swift"
  // ...
};
```

### Problem 3: Info.plist Path Mismatch

**Issue**: The `copyFolderRecursive()` function renames `Info.plist` to `${extensionName}-Info.plist` (e.g., `TASBroadcastExtension-Info.plist`), but the build settings referenced `${extensionName}/Info.plist`.

**Solution**: Update the `INFOPLIST_FILE` build setting to match the renamed file:

```javascript
const commonBuildSettings = {
  INFOPLIST_FILE: `${extensionName}/${extensionName}-Info.plist`,
  // ...
};
```

### Problem 4: App Group Entitlements Mismatch

**Issue**: The Debug entitlements files had a different app group (`group.com.dannyprikaz.tasprototype.dev`) than what the provisioning profile expected (`group.com.dannyprikaz.tasprototype`).

**Symptom**: Build error: `Provisioning profile doesn't match the entitlements file's value for the com.apple.security.application-groups entitlement`

**Solution**: Ensure all entitlements files (both Debug and Release) use the same app group that matches the provisioning profile:

```xml
<!-- TASBroadcastExtension.Debug.entitlements -->
<key>com.apple.security.application-groups</key>
<array>
  <string>group.com.dannyprikaz.tasprototype</string>
</array>
```

## Plugin File Structure

```
plugins/with-broadcast-extension/
├── withBroadcastExtension.js          # Main plugin code
├── README.md                          # This file
└── ios/
    ├── TASBroadcastExtension/
    │   ├── SampleHandler.swift        # Broadcast extension code
    │   ├── Info.plist                 # Extension Info.plist
    │   ├── TASBroadcastExtension.entitlements       # Release entitlements
    │   └── TASBroadcastExtension.Debug.entitlements # Debug entitlements
    └── TASBroadcastExtensionSetupUI/
        ├── BroadcastSetupViewController.swift
        ├── Info.plist
        ├── TASBroadcastExtensionSetupUI.entitlements
        └── TASBroadcastExtensionSetupUI.Debug.entitlements
```

## Usage

Add the plugin to your `app.config.js`:

```javascript
plugins: [
  // ... other plugins
  [
    "./plugins/with-broadcast-extension/withBroadcastExtension",
    {
      "appleTeamId": "YOUR_TEAM_ID"
    }
  ]
]
```

## Build Process

After making changes to the plugin or entitlements:

```bash
# Clean and rebuild
rm -rf ios
npx expo prebuild --platform ios
npx expo run:ios --device
```

## Debugging Tips

1. **Check if source files are in build phase**: Look for the Sources build phase in `project.pbxproj`:
   ```
   grep -A 10 "PBXSourcesBuildPhase" ios/TASPrototype.xcodeproj/project.pbxproj
   ```

2. **Verify extension has compiled binary**: After build, check the `.appex` contents:
   ```
   ls -la ~/Library/Developer/Xcode/DerivedData/TASPrototype-*/Build/Products/Debug-iphoneos/TASBroadcastExtension.appex/
   ```
   Should contain an executable file, not just Info.plist.

3. **Check code signing**: Verify extension is properly signed:
   ```
   codesign -dvvv ~/Library/Developer/Xcode/DerivedData/TASPrototype-*/Build/Products/Debug-iphoneos/TASBroadcastExtension.appex
   ```

## Known Warnings

The build may show version mismatch warnings:
```
The CFBundleShortVersionString of an app extension ('1.0') must match that of its containing parent app ('1.0.0').
```

To fix, update the `MARKETING_VERSION` in the extension build settings to match the main app's version.
