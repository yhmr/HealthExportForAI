/* eslint-env node */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// モード取得
const mode = process.argv[2] || 'debug';
console.log(`🔧 Build mode: ${mode} (Debug Only)`);

// 環境変数読み込み関数
function loadEnv(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`Loading env from ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach((line) => {
      // コメントや空行をスキップ
      if (!line || line.startsWith('#')) return;

      // KEY=VALUE 形式をパース (最初の = で分割)
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        // 既存の環境変数を上書きしない（Shellスクリプトの挙動に合わせるなら上書きでも良いが、通常プロセス環境変数が優先）
        // ここでは、プロセス環境変数にセットすることで子プロセスに渡す
        if (!process.env[key]) {
          // 値の引用符を削除等の処理が必要な場合もあるが、簡易的にそのままセット
          // xargs相当の処理は厳密には難しいが、通常の使用範囲ならこれで十分
          process.env[key] = value.replace(/^['"](.*)['"]$/, '$1');
        }
      }
    });
  }
}

// コマンド実行関数
function runCommand(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command} ${args.join(' ')}`);
    // Windows対応: npm, npx は .cmd が必要などが本来あるが、shell: true で吸収させる
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd,
      shell: true,
      env: process.env
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command "${command}" failed with code ${code}`));
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

(async () => {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const androidDir = path.join(rootDir, 'android');

    // 1. Install dependencies
    console.log('📦 Installing dependencies...');
    await runCommand('npm', ['ci'], rootDir);

    // 2. Prebuild
    console.log('🏗️  Running prebuild...');
    await runCommand(
      'npx',
      ['expo', 'prebuild', '--clean', '--platform', 'android', '--no-install'],
      rootDir
    );

    // 3. Load Environment Variables
    console.log('🚀 Setting up environment...');
    loadEnv(path.join(rootDir, '.env'));
    loadEnv(path.join(rootDir, '.env.local'));

    // 4. Gradle Build
    const isWindows = process.platform === 'win32';
    const gradlew = isWindows ? 'gradlew.bat' : './gradlew';

    const tasks = ['clean', 'assembleDebug', 'assembleRelease'];

    console.log('🚀 Starting Debug build...');
    // Androidディレクトリが存在することを確認 (Prebuildで生成されるはずだが念のため)
    if (!fs.existsSync(androidDir)) {
      throw new Error(`Android directory not found at ${androidDir}`);
    }

    await runCommand(gradlew, tasks, androidDir);

    console.log('✅ Debug Build complete!');
    console.log(
      `APK: ${path.join('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')}`
    );
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
})();
