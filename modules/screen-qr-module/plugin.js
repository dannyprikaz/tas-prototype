const { withEntitlementsPlist } = require('@expo/config-plugins');

module.exports = function withTASBroadcastExtension(config) {
  return withEntitlementsPlist(config, config => {
    const existing = config.modResults['com.apple.security.application-groups'] ?? [];
    const set = new Set(existing);
    set.add('group.com.dannyprikaz.tasprototype');
    config.modResults['com.apple.security.application-groups'] = Array.from(set);
    return config;
  });
};
