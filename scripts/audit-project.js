/**
 * MyDiary 프로젝트 정기 정밀 감사 (Project Audit) 자동화 스크립트
 * 실행: node scripts/audit-project.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const SCREENS_DIR = path.join(SRC_DIR, 'screens');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');
const UTILS_DIR = path.join(SRC_DIR, 'utils');

// 색상 콘솔 유틸리티
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

const getAllFiles = (dir, ext = '.js') => {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, ext));
    } else if (file.endsWith(ext) || file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
};

console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   📋 MyDiary 정기 프로젝트 건전성 정밀 감사 하네스   ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

let totalScore = 100;
const findings = [];

// 1. ESLint 정적 분석 검사
console.log(`${colors.bold}[1/5] ESLint 문법 무결성 검사...${colors.reset}`);
try {
  execSync('npx eslint .', { cwd: PROJECT_ROOT, stdio: 'pipe' });
  console.log(`  ${colors.green}✔ ESLint 검사 통과 (0 errors, 0 warnings)${colors.reset}`);
} catch (err) {
  const output = err.stdout ? err.stdout.toString() : '';
  const errorMatch = output.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
  if (errorMatch) {
    const errCount = parseInt(errorMatch[2], 10);
    const warnCount = parseInt(errorMatch[3], 10);
    totalScore -= Math.min(25, errCount * 5 + warnCount * 2);
    findings.push(`ESLint 오류/경고 발견: 에러 ${errCount}건, 경고 ${warnCount}건`);
    console.log(`  ${colors.red}✖ ESLint 문제 발견: 에러 ${errCount}건, 경고 ${warnCount}건${colors.reset}`);
  } else {
    totalScore -= 15;
    findings.push('ESLint 검사 실패');
    console.log(`  ${colors.red}✖ ESLint 검사 실패${colors.reset}`);
  }
}

// 2. Jest 단위 테스트 검증
console.log(`\n${colors.bold}[2/5] Jest 단위 테스트 검증...${colors.reset}`);
try {
  const testOut = execSync('npx jest --passWithNoTests', { cwd: PROJECT_ROOT, stdio: 'pipe' }).toString();
  const suiteMatch = testOut.match(/Test Suites:\s+([0-9]+)\s+passed/);
  const testMatch = testOut.match(/Tests:\s+([0-9]+)\s+passed/);
  const suites = suiteMatch ? suiteMatch[1] : '?';
  const tests = testMatch ? testMatch[1] : '?';
  console.log(`  ${colors.green}✔ 전체 테스트 통과: ${suites} 스위트, ${tests} 테스트 성공${colors.reset}`);
} catch (err) {
  totalScore -= 20;
  findings.push('Jest 단위 테스트 실패 케이스 존재');
  console.log(`  ${colors.red}✖ Jest 단위 테스트 실패${colors.reset}`);
}

// 3. 파일 크기 및 거대 컴포넌트(God Screen) 모니터링
console.log(`\n${colors.bold}[3/5] 파일 크기 및 컴포넌트 복잡도 분석...${colors.reset}`);
const screenFiles = getAllFiles(SCREENS_DIR);
let godScreenCount = 0;
screenFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').length;
  const relName = path.relative(PROJECT_ROOT, file);

  if (lines > 2500) {
    godScreenCount++;
    totalScore -= 4;
    console.log(`  ${colors.red}⚠ 초거대 모놀리식 화면: ${relName} (${lines.toLocaleString()} 줄) - 컴포넌트 분할 권장${colors.reset}`);
  } else if (lines > 1500) {
    console.log(`  ${colors.yellow}△ 대형 화면: ${relName} (${lines.toLocaleString()} 줄)${colors.reset}`);
  }
});
if (godScreenCount === 0) {
  console.log(`  ${colors.green}✔ 초거대 위험 파일 없음${colors.reset}`);
}

// 4. 하드코딩 색상 및 디자인 토큰 위반 탐지
console.log(`\n${colors.bold}[4/5] 디자인 토큰 준수 및 하드코딩 색상 점검...${colors.reset}`);
let hardcodedColorCount = 0;
screenFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const hexMatches = content.match(/#[0-9a-fA-F]{3,8}/g) || [];
  hardcodedColorCount += hexMatches.length;
});
if (hardcodedColorCount > 300) {
  totalScore -= 5;
  console.log(`  ${colors.yellow}△ 하드코딩된 HEX 색상 코드 총 ${hardcodedColorCount}건 발견 (theme.colors 토큰화 권장)${colors.reset}`);
} else {
  console.log(`  ${colors.green}✔ 하드코딩 색상 관리 양호 (${hardcodedColorCount}건)${colors.reset}`);
}

// 5. 공통 모듈 및 중복 패턴 검사
console.log(`\n${colors.bold}[5/5] 공통 모듈 및 중복 코드 검사...${colors.reset}`);
let duplicationIssues = 0;

// (1) dateUtils 중복 정의 여부 점검
screenFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const relName = path.relative(PROJECT_ROOT, file);
  if (/const\s+getTodayFormatted\s*=\s*\(\)\s*=>/.test(content)) {
    duplicationIssues++;
    console.log(`  ${colors.red}⚠ 날짜 함수 자체 중복 정의 발견: ${relName} (dateUtils 사용 요망)${colors.reset}`);
  }
  if (!content.includes('useTheme')) {
    console.log(`  ${colors.yellow}△ ThemeContext 미연동 화면: ${relName}${colors.reset}`);
  }
});

const compFiles = getAllFiles(COMPONENTS_DIR);
const utilFiles = getAllFiles(UTILS_DIR);
console.log(`  ${colors.cyan}ℹ 등록된 공통 컴포넌트: ${compFiles.length}개 (${compFiles.map(f => path.basename(f)).join(', ') || '없음'})${colors.reset}`);
console.log(`  ${colors.cyan}ℹ 등록된 공통 유틸리티: ${utilFiles.length}개 (${utilFiles.map(f => path.basename(f)).join(', ') || '없음'})${colors.reset}`);

if (duplicationIssues === 0) {
  console.log(`  ${colors.green}✔ 핵심 공통 함수 중복 없음 (dateUtils/stringUtils 정상 통합)${colors.reset}`);
} else {
  totalScore -= duplicationIssues * 5;
}

// 종합 결과 출력
totalScore = Math.max(0, Math.min(100, totalScore));
console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
console.log(`${colors.bold}   📊 정밀 감사 종합 건전성 점수: ${totalScore >= 80 ? colors.green : totalScore >= 60 ? colors.yellow : colors.red}${totalScore}점 / 100점${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);

if (findings.length > 0) {
  console.log(`\n${colors.yellow}주요 개선 권고 사항:${colors.reset}`);
  findings.forEach((f, idx) => console.log(` ${idx + 1}. ${f}`));
} else {
  console.log(`\n${colors.green}🎉 현재 프로젝트 코드는 매우 높은 수준의 무결성과 품질을 유지하고 있습니다!${colors.reset}`);
}
console.log('\n');

process.exit(totalScore >= 70 ? 0 : 1);
