const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const existing = config.resolver.blockList;
// Nest replaces its output directory while building. Metro must not watch those
// generated backend files: on Windows that can terminate the frontend watcher.
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  /[\\/]apps[\\/]api[\\/]dist(?:[\\/].*)?$/,
];
module.exports = config;
