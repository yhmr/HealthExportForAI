const { withAppBuildGradle } = require('@expo/config-plugins');

const withWoAFix = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = applyHermesPatch(config.modResults.contents);
    }
    return config;
  });
};

function applyHermesPatch(buildGradle) {
  // 置換対象の元のコード
  const pattern = /reactNativeDir\s*=\s*new\s+File\(\["node",\s*"--print",\s*"require\.resolve\('react-native\/package\.json'\)"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\)\)\.getParentFile\(\)\.getAbsoluteFile\(\)\s*hermesCommand\s*=\s*new\s+File\(\["node",\s*"--print",\s*"require\.resolve\('react-native\/package\.json'\)"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\)\)\.getParentFile\(\)\.getAbsolutePath\(\)\s*\+\s*"\/sdks\/hermesc\/%OS-BIN%\/hermesc"/;

  const replacement = `
    // [WoA Fix] Patch Hermes path for Windows on Arm / WSL
    def reactNativePath = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath()
    reactNativeDir = new File(reactNativePath)
    hermesCommand = reactNativePath + "/sdks/hermesc/linux64-bin/hermesc"
  `.trim();

  // すでにパッチが当たっているか確認
  if (buildGradle.includes('linux64-bin/hermesc')) {
    return buildGradle;
  }

  return buildGradle.replace(pattern, replacement);
}

module.exports = withWoAFix;
