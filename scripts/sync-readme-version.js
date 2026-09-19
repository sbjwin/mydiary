const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const readmePath = path.resolve(__dirname, '..', 'README.md');

if (!fs.existsSync(packageJsonPath) || !fs.existsSync(readmePath)) {
  console.error('[sync-readme-version] package.json 또는 README.md를 찾을 수 없습니다.');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = pkg.version;

if (!currentVersion) {
  console.error('[sync-readme-version] package.json에 version 필드가 없습니다.');
  process.exit(0);
}

let readme = fs.readFileSync(readmePath, 'utf8');

// # MyDiary (내 일상 수업 다이어리) - vX.Y.Z
const titleRegex = /(#\s*MyDiary\s*\([^)]*\)\s*-\s*v)\d+\.\d+\.\d+/g;
readme = readme.replace(titleRegex, `$1${currentVersion}`);

// ## 🌟 vX.Y.Z 주요 기능 및 특징
const featureHeaderRegex = /(##\s*🌟\s*v)\d+\.\d+\.\d+(\s*주요\s*기능)/g;
readme = readme.replace(featureHeaderRegex, `$1${currentVersion}$2`);

fs.writeFileSync(readmePath, readme, 'utf8');
console.log(`[sync-readme-version] README.md 버전이 v${currentVersion}(으)로 동기화되었습니다.`);
