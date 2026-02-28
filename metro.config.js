const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Tell Metro's file watcher to completely ignore .gradle folders
config.resolver.blockList = [
  // Keep existing blocklists if there are any
  ...Array.from(config.resolver.blockList || []),
  // Add regex to ignore anything with .gradle in the path
  /.*\.gradle.*/
];

module.exports = config;