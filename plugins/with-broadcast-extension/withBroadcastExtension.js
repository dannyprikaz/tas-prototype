const {
  withXcodeProject,
  withEntitlementsPlist,
  withDangerousMod,
  withInfoPlist,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const BROADCAST_EXTENSION_NAME = "TASBroadcastExtension";
const SETUP_UI_EXTENSION_NAME = "TASBroadcastExtensionSetupUI";

function withBroadcastExtension(config, props = {}) {
  const { appleTeamId } = props;

  if (!appleTeamId) {
    throw new Error(
      "withBroadcastExtension: appleTeamId is required. Please provide your Apple Developer Team ID."
    );
  }

  // Step 1: Copy extension source files
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosPath = path.join(projectRoot, "ios");
      const pluginSourcePath = path.join(
        projectRoot,
        "plugins",
        "with-broadcast-extension",
        "ios"
      );

      // Copy TASBroadcastExtension
      const broadcastExtPath = path.join(iosPath, BROADCAST_EXTENSION_NAME);
      const broadcastExtSourcePath = path.join(
        pluginSourcePath,
        BROADCAST_EXTENSION_NAME
      );

      if (!fs.existsSync(broadcastExtPath)) {
        fs.mkdirSync(broadcastExtPath, { recursive: true });
      }
      copyFolderRecursive(broadcastExtSourcePath, broadcastExtPath, BROADCAST_EXTENSION_NAME);

      // Copy TASBroadcastExtensionSetupUI
      const setupUIPath = path.join(iosPath, SETUP_UI_EXTENSION_NAME);
      const setupUISourcePath = path.join(
        pluginSourcePath,
        SETUP_UI_EXTENSION_NAME
      );

      if (!fs.existsSync(setupUIPath)) {
        fs.mkdirSync(setupUIPath, { recursive: true });
      }
      copyFolderRecursive(setupUISourcePath, setupUIPath, SETUP_UI_EXTENSION_NAME);

      return config;
    },
  ]);

  // Step 2: Add app group entitlement to main app
  config = withEntitlementsPlist(config, (config) => {
    const bundleId = config.ios?.bundleIdentifier || "com.dannyprikaz.tasprototype";
    const appGroup = `group.${bundleId}`;

    const existing = config.modResults["com.apple.security.application-groups"] ?? [];
    const set = new Set(existing);
    set.add(appGroup);
    config.modResults["com.apple.security.application-groups"] = Array.from(set);
    return config;
  });

  // Step 3: Modify Xcode project to add extension targets
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const bundleId = config.ios?.bundleIdentifier || "com.dannyprikaz.tasprototype";
    const appGroup = `group.${bundleId}`;
    const projectName = config.modRequest.projectName;

    // Add extension targets
    addBroadcastExtensionTarget(
      xcodeProject,
      BROADCAST_EXTENSION_NAME,
      bundleId,
      appleTeamId,
      appGroup,
      projectName
    );

    addSetupUIExtensionTarget(
      xcodeProject,
      SETUP_UI_EXTENSION_NAME,
      bundleId,
      appleTeamId,
      appGroup,
      projectName
    );

    return config;
  });

  return config;
}

function copyFolderRecursive(source, target, extensionName = null) {
  if (!fs.existsSync(source)) {
    console.warn(`Source folder does not exist: ${source}`);
    return;
  }

  const files = fs.readdirSync(source);
  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    let targetFile = file;

    // Rename Info.plist to match Xcode's expected naming convention
    if (file === "Info.plist" && extensionName) {
      targetFile = `${extensionName}-Info.plist`;
    }

    const targetPath = path.join(target, targetFile);

    if (fs.statSync(sourcePath).isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      copyFolderRecursive(sourcePath, targetPath, extensionName);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

function addBroadcastExtensionTarget(
  xcodeProject,
  extensionName,
  bundleId,
  teamId,
  appGroup,
  projectName
) {
  // Check if target already exists
  const existingTarget = xcodeProject.pbxTargetByName(extensionName);
  if (existingTarget) {
    console.log(`Target ${extensionName} already exists, skipping...`);
    return;
  }

  // Create build configurations
  const commonBuildSettings = {
    ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS: "YES",
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: '"gnu++20"',
    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: "1",
    DEVELOPMENT_TEAM: teamId,
    GENERATE_INFOPLIST_FILE: "NO",
    GCC_C_LANGUAGE_STANDARD: "gnu17",
    INFOPLIST_FILE: `${extensionName}/${extensionName}-Info.plist`,
    IPHONEOS_DEPLOYMENT_TARGET: "15.1",
    LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
    LOCALIZATION_PREFERS_STRING_CATALOGS: "YES",
    MARKETING_VERSION: "1.0",
    MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
    MTL_FAST_MATH: "YES",
    PRODUCT_BUNDLE_IDENTIFIER: `${bundleId}.${extensionName}`,
    PRODUCT_NAME: '"$(TARGET_NAME)"',
    SKIP_INSTALL: "YES",
    SWIFT_ACTIVE_COMPILATION_CONDITIONS: '"$(inherited)"',
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: '"1,2"',
  };

  const debugBuildSettings = {
    ...commonBuildSettings,
    CODE_SIGN_ENTITLEMENTS: `${extensionName}/${extensionName}.Debug.entitlements`,
    DEBUG_INFORMATION_FORMAT: "dwarf",
    MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
  };

  const releaseBuildSettings = {
    ...commonBuildSettings,
    CODE_SIGN_ENTITLEMENTS: `${extensionName}/${extensionName}.entitlements`,
    COPY_PHASE_STRIP: "NO",
    DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
  };

  // Add the extension target
  const target = xcodeProject.addTarget(
    extensionName,
    "app_extension",
    extensionName,
    `${bundleId}.${extensionName}`
  );

  // Update build configurations for the target
  const configurations = xcodeProject.pbxXCBuildConfigurationSection();
  const configList = xcodeProject.pbxXCConfigurationList();

  // Find the target's build configuration list
  const targetObj = xcodeProject.pbxNativeTargetSection()[target.uuid];
  if (targetObj && targetObj.buildConfigurationList) {
    const configListId = targetObj.buildConfigurationList;
    const configListObj = configList[configListId];
    if (configListObj && configListObj.buildConfigurations) {
      configListObj.buildConfigurations.forEach((configRef) => {
        const configId = configRef.value;
        const config = configurations[configId];
        if (config) {
          if (config.name === "Debug" || config.name === "Development") {
            config.buildSettings = { ...config.buildSettings, ...debugBuildSettings };
          } else if (config.name === "Release") {
            config.buildSettings = { ...config.buildSettings, ...releaseBuildSettings };
          }
        }
      });
    }
  }

  // Add source files to the target's Sources build phase
  const sourceFiles = ["SampleHandler.swift"];
  addSourceFilesToTarget(xcodeProject, target.uuid, extensionName, sourceFiles);

  // Add files to a group for organization
  xcodeProject.addPbxGroup(
    [...sourceFiles, `${extensionName}-Info.plist`, `${extensionName}.entitlements`, `${extensionName}.Debug.entitlements`],
    extensionName,
    extensionName
  );

  // Add ReplayKit framework
  xcodeProject.addFramework("ReplayKit.framework", {
    target: target.uuid,
    link: true,
  });

  // Add Vision framework (for QR detection)
  xcodeProject.addFramework("Vision.framework", {
    target: target.uuid,
    link: true,
  });

  // Add extension to embed phase
  addExtensionToEmbedPhase(xcodeProject, extensionName, target.uuid, projectName);

  // Add target dependency
  addTargetDependency(xcodeProject, target.uuid, extensionName, projectName);
}

function addSetupUIExtensionTarget(
  xcodeProject,
  extensionName,
  bundleId,
  teamId,
  appGroup,
  projectName
) {
  // Check if target already exists
  const existingTarget = xcodeProject.pbxTargetByName(extensionName);
  if (existingTarget) {
    console.log(`Target ${extensionName} already exists, skipping...`);
    return;
  }

  const commonBuildSettings = {
    ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS: "YES",
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: '"gnu++20"',
    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: "1",
    DEVELOPMENT_TEAM: teamId,
    GENERATE_INFOPLIST_FILE: "NO",
    GCC_C_LANGUAGE_STANDARD: "gnu17",
    INFOPLIST_FILE: `${extensionName}/${extensionName}-Info.plist`,
    IPHONEOS_DEPLOYMENT_TARGET: "15.1",
    LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
    LOCALIZATION_PREFERS_STRING_CATALOGS: "YES",
    MARKETING_VERSION: "1.0",
    MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
    MTL_FAST_MATH: "YES",
    PRODUCT_BUNDLE_IDENTIFIER: `${bundleId}.${extensionName}`,
    PRODUCT_NAME: '"$(TARGET_NAME)"',
    SKIP_INSTALL: "YES",
    SWIFT_ACTIVE_COMPILATION_CONDITIONS: '"$(inherited)"',
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: '"1,2"',
  };

  const debugBuildSettings = {
    ...commonBuildSettings,
    CODE_SIGN_ENTITLEMENTS: `${extensionName}/${extensionName}.Debug.entitlements`,
    DEBUG_INFORMATION_FORMAT: "dwarf",
    MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
  };

  const releaseBuildSettings = {
    ...commonBuildSettings,
    CODE_SIGN_ENTITLEMENTS: `${extensionName}/${extensionName}.entitlements`,
    COPY_PHASE_STRIP: "NO",
    DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
  };

  // Add the extension target
  const target = xcodeProject.addTarget(
    extensionName,
    "app_extension",
    extensionName,
    `${bundleId}.${extensionName}`
  );

  // Update build configurations for the target
  const configurations = xcodeProject.pbxXCBuildConfigurationSection();
  const configList = xcodeProject.pbxXCConfigurationList();

  // Find the target's build configuration list
  const targetObj = xcodeProject.pbxNativeTargetSection()[target.uuid];
  if (targetObj && targetObj.buildConfigurationList) {
    const configListId = targetObj.buildConfigurationList;
    const configListObj = configList[configListId];
    if (configListObj && configListObj.buildConfigurations) {
      configListObj.buildConfigurations.forEach((configRef) => {
        const configId = configRef.value;
        const config = configurations[configId];
        if (config) {
          if (config.name === "Debug" || config.name === "Development") {
            config.buildSettings = { ...config.buildSettings, ...debugBuildSettings };
          } else if (config.name === "Release") {
            config.buildSettings = { ...config.buildSettings, ...releaseBuildSettings };
          }
        }
      });
    }
  }

  // Add source files to the target's Sources build phase
  const sourceFiles = ["BroadcastSetupViewController.swift"];
  addSourceFilesToTarget(xcodeProject, target.uuid, extensionName, sourceFiles);

  // Add files to a group for organization
  xcodeProject.addPbxGroup(
    [...sourceFiles, `${extensionName}-Info.plist`, `${extensionName}.entitlements`, `${extensionName}.Debug.entitlements`],
    extensionName,
    extensionName
  );

  // Add ReplayKit framework
  xcodeProject.addFramework("ReplayKit.framework", {
    target: target.uuid,
    link: true,
  });

  // Add UIKit framework
  xcodeProject.addFramework("UIKit.framework", {
    target: target.uuid,
    link: true,
  });

  // Add extension to embed phase
  addExtensionToEmbedPhase(xcodeProject, extensionName, target.uuid, projectName);

  // Add target dependency
  addTargetDependency(xcodeProject, target.uuid, extensionName, projectName);
}

function addSourceFilesToTarget(xcodeProject, targetUuid, extensionName, sourceFiles) {
  // Get the target from the native targets section
  const nativeTargets = xcodeProject.pbxNativeTargetSection();
  const target = nativeTargets[targetUuid];

  if (!target) {
    console.warn(`Could not find target for ${extensionName}`);
    return;
  }

  // Initialize buildPhases if empty
  if (!target.buildPhases) {
    target.buildPhases = [];
  }

  // Access objects through hash.project.objects
  const objects = xcodeProject.hash.project.objects;

  // Ensure PBXSourcesBuildPhase section exists
  if (!objects["PBXSourcesBuildPhase"]) {
    objects["PBXSourcesBuildPhase"] = {};
  }
  const sourcesPhases = objects["PBXSourcesBuildPhase"];

  // Create a new Sources build phase for this target
  const sourcesBuildPhaseUuid = xcodeProject.generateUuid();
  sourcesPhases[sourcesBuildPhaseUuid] = {
    isa: "PBXSourcesBuildPhase",
    buildActionMask: 2147483647,
    files: [],
    runOnlyForDeploymentPostprocessing: 0,
  };
  sourcesPhases[`${sourcesBuildPhaseUuid}_comment`] = "Sources";

  // Add the Sources build phase to the target's buildPhases
  target.buildPhases.push({
    value: sourcesBuildPhaseUuid,
    comment: "Sources",
  });

  const sourcesPhase = sourcesPhases[sourcesBuildPhaseUuid];

  // Ensure PBXFileReference and PBXBuildFile sections exist
  if (!objects["PBXFileReference"]) {
    objects["PBXFileReference"] = {};
  }
  if (!objects["PBXBuildFile"]) {
    objects["PBXBuildFile"] = {};
  }
  const fileRefs = objects["PBXFileReference"];
  const buildFiles = objects["PBXBuildFile"];

  for (const sourceFile of sourceFiles) {
    // Create file reference with full path relative to project root
    const fileRefUuid = xcodeProject.generateUuid();
    const filePath = `${extensionName}/${sourceFile}`;
    fileRefs[fileRefUuid] = {
      isa: "PBXFileReference",
      lastKnownFileType: "sourcecode.swift",
      path: filePath,
      sourceTree: '"<group>"',
      name: sourceFile,
    };
    fileRefs[`${fileRefUuid}_comment`] = sourceFile;

    // Create build file
    const buildFileUuid = xcodeProject.generateUuid();
    buildFiles[buildFileUuid] = {
      isa: "PBXBuildFile",
      fileRef: fileRefUuid,
      fileRef_comment: sourceFile,
    };
    buildFiles[`${buildFileUuid}_comment`] = `${sourceFile} in Sources`;

    // Add to Sources build phase
    sourcesPhase.files.push({
      value: buildFileUuid,
      comment: `${sourceFile} in Sources`,
    });
  }

  console.log(`Added ${sourceFiles.length} source file(s) to ${extensionName}`);
}

function addExtensionToEmbedPhase(xcodeProject, extensionName, targetUuid, projectName) {
  // Find or create "Embed Foundation Extensions" build phase
  const mainTarget = xcodeProject.getFirstTarget();
  if (!mainTarget) return;

  const buildPhases = xcodeProject.pbxCopyfilesBuildPhaseObj();
  let embedPhaseUuid = null;

  // Find existing "Embed Foundation Extensions" phase
  for (const uuid in buildPhases) {
    if (buildPhases[uuid].name === '"Embed Foundation Extensions"') {
      embedPhaseUuid = uuid;
      break;
    }
  }

  // Create if doesn't exist
  if (!embedPhaseUuid) {
    embedPhaseUuid = xcodeProject.generateUuid();
    xcodeProject.addBuildPhase(
      [],
      "PBXCopyFilesBuildPhase",
      "Embed Foundation Extensions",
      mainTarget.uuid,
      { dstSubfolderSpec: 13 } // PlugIns folder
    );
  }
}

function addTargetDependency(xcodeProject, targetUuid, targetName, projectName) {
  const mainTarget = xcodeProject.getFirstTarget();
  if (!mainTarget) return;

  xcodeProject.addTargetDependency(mainTarget.uuid, [targetUuid]);
}

module.exports = withBroadcastExtension;
