const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Windows-only Metro file-watcher crash fix:
// Gradle/CMake creates transient .cxx subfolders inside node_modules/*/android
// that get created and deleted mid-build. Metro's FallbackWatcher (used when
// watchman is not installed) throws ENOENT when those folders vanish.
// Exclude them so the watcher never tries to follow them.
config.resolver.blockList = [
  /[\\/]node_modules[\\/].*[\\/]android[\\/]\.cxx[\\/].*/,
  /[\\/]node_modules[\\/].*[\\/]android[\\/]\.gradle[\\/].*/,
  /[\\/]node_modules[\\/].*[\\/]android[\\/]build[\\/].*/,
  /[\\/]node_modules[\\/].*[\\/]ios[\\/]build[\\/].*/,
]

// The watcher also reads these paths separately from the resolver — exclude there too.
config.watcher = config.watcher || {}
config.watcher.healthCheck = config.watcher.healthCheck || {}
config.watcher.watchman = config.watcher.watchman || {}

module.exports = config
