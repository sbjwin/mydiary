/**
 * MyDiary GitHub 업적(Achievements) 연계 Git 자동화 하네스
 *
 * 타겟 업적:
 * 1. 👥 Pair Extraordinaire: zigman1234 공동 저자 태그 자동 삽입
 * 2. ⚡ Quickdraw: 작업 브랜치 생성 -> PR 생성 -> 5분 이내 머지
 * 3. 🦈 Pull Shark: PR 머지 횟수 자동 누적
 * 4. 🤠 YOLO: 브랜치 보호 규칙 하에서 코드 리뷰 없이 즉시 머지
 *
 * 사용법:
 * - npm run git:pr -- "커밋 메시지"        (PR 생성 및 5분 내 머지 모드 - 4대 뱃지 동시 달성)
 * - npm run git:commit -- "커밋 메시지"    (main 직접 푸시 모드 - Pair 뱃지 달성)
 */

const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');

const REPO_OWNER = 'sbjwin';
const REPO_NAME = 'mydiary';
const CO_AUTHOR = 'Co-authored-by: zigman1234 <zigman1234@users.noreply.github.com>';

function run(command, options = {}) {
  try {
    return execSync(command, {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (!options.ignoreError) {
      console.error(`\n❌ 명령어 실행 실패: ${command}`);
      throw error;
    }
    return '';
  }
}

function getCommitMessage() {
  const args = process.argv.slice(3);
  let msg = args.join(' ').trim();
  if (!msg) {
    msg = 'chore: MyDiary 기능 업데이트 및 코드 품질 개선';
  }
  if (!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(msg)) {
    console.error(`\n❌ [커밋 차단] 커밋 메시지("${msg}")에 한국어가 포함되어 있지 않습니다.`);
    console.error('   MyDiary 헌장에 따라 모든 Git 커밋 메시지는 100% 한국어로 작성해야 합니다.\n');
    process.exit(1);
  }
  return msg;
}

async function createAndMergeViaAPI(token, branchName, title) {
  const headers = {
    'Authorization': `token ${token}`,
    'User-Agent': 'MyDiary-Achievement-Harness',
    'Accept': 'application/vnd.github+json'
  };

  console.log('🤖 GitHub API를 통해 PR을 자동 생성합니다...');
  const prRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title,
      head: branchName,
      base: 'main',
      body: `### 🌟 GitHub 업적 연계 PR\n\n* **작업 내용**: ${title}\n* **협업자**: @zigman1234\n\n${CO_AUTHOR}`
    })
  });

  const prData = await prRes.json();
  if (!prRes.ok) {
    throw new Error(`PR 생성 실패: ${prData.message || JSON.stringify(prData)}`);
  }

  const prNumber = prData.number;
  console.log(`✅ PR #${prNumber} 생성 완료: ${prData.html_url}`);

  console.log('⚡ 5분 이내 머지를 트리거합니다 (Quickdraw & YOLO & Pull Shark 달성!)...');
  const mergeRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/merge`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      commit_title: `${title} (#${prNumber})`,
      commit_message: CO_AUTHOR,
      merge_method: 'squash'
    })
  });

  const mergeData = await mergeRes.json();
  if (!mergeRes.ok) {
    throw new Error(`PR 머지 실패: ${mergeData.message || JSON.stringify(mergeData)}`);
  }

  console.log(`🎉 PR #${prNumber} 자동 머지 완료! (업적 달성 조건 만족)`);
}

async function handlePRMode(commitMsg) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const branchName = `feat/achieve-${timestamp}`;

  console.log('\n======================================================');
  console.log('🏆 MyDiary 4대 뱃지 달성 PR 워크플로우를 시작합니다');
  console.log('   (Quickdraw + Pull Shark + Pair Extraordinaire + YOLO)');
  console.log('======================================================\n');

  // 1. 상태 확인
  const status = run('git status --porcelain', { silent: true });
  if (!status.trim()) {
    console.log('⚠️ 변경된 파일이 없습니다. 워크트리가 깨끗합니다.');
    return;
  }

  // 2. 임시 브랜치 생성 및 체크아웃
  console.log(`📌 작업 브랜치 [${branchName}] 생성 및 전환...`);
  run(`git checkout -b ${branchName}`);

  // 3. 파일 스테이징 및 Co-authored 커밋
  console.log('📝 변경 사항 스테이징 및 Co-author 커밋 작성...');
  run('git add -A');
  run(`git commit -m "${commitMsg}" -m "${CO_AUTHOR}"`);

  // 4. 원격 브랜치 푸시
  console.log(`🚀 원격 저장소에 [${branchName}] 브랜치 푸시...`);
  run(`git push -u origin ${branchName}`);

  const token = process.env.GITHUB_TOKEN;
  const compareUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/compare/main...${branchName}?expand=1`;

  if (token) {
    try {
      await createAndMergeViaAPI(token, branchName, commitMsg);
    } catch (err) {
      console.warn(`⚠️ API 자동 머지 중 알림 (${err.message}). 웹 브라우저 방식으로 대체합니다.`);
      openBrowserAndPrompt(compareUrl);
    }
  } else {
    await openBrowserAndPrompt(compareUrl);
  }

  // 5. 로컬 main 복귀 및 동기화
  console.log('\n🔄 로컬 main 브랜치 동기화 및 임시 브랜치 정리...');
  run('git checkout main');
  run('git pull origin main');
  run(`git branch -D ${branchName}`, { ignoreError: true });
  run(`git push origin --delete ${branchName}`, { ignoreError: true, silent: true });

  console.log('\n✨ 모든 업적 연계 커밋 및 머지가 완벽하게 완료되었습니다! 🏆\n');
}

function openBrowserAndPrompt(compareUrl) {
  return new Promise((resolve) => {
    console.log('\n🌐 GitHub PR 생성 페이지를 엽니다:');
    console.log(`   ${compareUrl}\n`);

    // Windows 브라우저 자동 열기
    try {
      execSync(`cmd /c start "" "${compareUrl}"`);
    } catch {
      // 무시
    }

    console.log('------------------------------------------------------');
    console.log('👉 [안내] 브라우저에서 아래 2단계를 5분 안에 완료하세요:');
    console.log('   1. 녹색 [Create pull request] 버튼 클릭');
    console.log('   2. 녹색 [Merge pull request] ➔ [Confirm merge] 클릭');
    console.log('   (⚡ 5분 이내 머지 시 Quickdraw + YOLO + Pull Shark 동시 달성!)');
    console.log('------------------------------------------------------');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\n머지를 완료하셨으면 [Enter] 키를 눌러주세요: ', () => {
      rl.close();
      resolve();
    });
  });
}

function handleDirectMode(commitMsg) {
  console.log('\n======================================================');
  console.log('👥 Pair Extraordinaire (Co-author) 직커밋을 실행합니다');
  console.log('======================================================\n');

  const status = run('git status --porcelain', { silent: true });
  if (!status.trim()) {
    console.log('⚠️ 변경된 파일이 없습니다. 워크트리가 깨끗합니다.');
    return;
  }

  run('git add -A');
  run(`git commit -m "${commitMsg}" -m "${CO_AUTHOR}"`);
  run('git push origin main');

  console.log('\n✨ Co-author가 포함된 직커밋이 원격 main에 반영되었습니다!\n');
}

async function main() {
  const mode = process.argv[2] || 'pr';
  const commitMsg = getCommitMessage();

  if (mode === 'direct') {
    handleDirectMode(commitMsg);
  } else {
    await handlePRMode(commitMsg);
  }
}

main().catch((err) => {
  console.error('\n❌ 에러 발생:', err.message);
  process.exit(1);
});
