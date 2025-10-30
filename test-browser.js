// Playwright 브라우저 테스트 스크립트
const { chromium } = require('playwright');

(async () => {
  console.log('🚀 브라우저 실행 중...');

  const browser = await chromium.launch({
    headless: false,  // 브라우저 UI 보이기
    slowMo: 500       // 천천히 실행 (관찰용)
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // 콘솔 로그 수집
  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type()}]:`, msg.text());
  });

  // 네트워크 요청 모니터링
  page.on('request', request => {
    console.log(`📤 Request: ${request.method()} ${request.url()}`);
  });

  page.on('response', response => {
    console.log(`📥 Response: ${response.status()} ${response.url()}`);
  });

  // 에러 캡처
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });

  try {
    console.log('\n=== 테스트 1: 메인 페이지 ===');
    await page.goto('http://localhost:8788/');
    await page.waitForLoadState('networkidle');
    console.log('✅ 메인 페이지 로드 완료');

    console.log('\n=== 테스트 2: test.html ===');
    await page.goto('http://localhost:8788/test.html');
    await page.waitForLoadState('networkidle');
    const testContent = await page.textContent('h1');
    console.log(`✅ test.html 내용: ${testContent}`);

    console.log('\n=== 테스트 3: teacher.html 직접 접근 ===');
    try {
      await page.goto('http://localhost:8788/teacher.html', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      console.log('✅ teacher.html 로드 성공!');
      const title = await page.title();
      console.log(`   페이지 타이틀: ${title}`);
    } catch (error) {
      console.error('❌ teacher.html 로드 실패:', error.message);
    }

    console.log('\n=== 테스트 4: student.html 직접 접근 ===');
    try {
      await page.goto('http://localhost:8788/student.html', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      console.log('✅ student.html 로드 성공!');
      const title = await page.title();
      console.log(`   페이지 타이틀: ${title}`);
    } catch (error) {
      console.error('❌ student.html 로드 실패:', error.message);
    }

    console.log('\n=== 테스트 5: 로그인 시뮬레이션 ===');
    await page.goto('http://localhost:8788/');
    await page.waitForLoadState('networkidle');

    // 이름 입력
    await page.fill('#name', '테스트강사');

    // 역할 선택 (강사)
    await page.selectOption('#role', 'teacher');

    // 로그인 버튼 클릭
    console.log('로그인 버튼 클릭...');
    await page.click('button[type="submit"]');

    // 페이지 이동 대기
    await page.waitForTimeout(2000);

    // 현재 URL 확인
    const currentUrl = page.url();
    console.log(`현재 URL: ${currentUrl}`);

    // 페이지 타이틀 확인
    const pageTitle = await page.title();
    console.log(`페이지 타이틀: ${pageTitle}`);

    // 페이지 내용 확인
    const bodyText = await page.textContent('body');
    if (bodyText.includes('강사 페이지')) {
      console.log('✅ 강사 페이지 로드 성공!');
    } else if (bodyText.includes('404') || bodyText.includes('Not Found')) {
      console.log('❌ 404 에러 발생');
    } else {
      console.log('⚠️ 예상치 못한 페이지:', bodyText.substring(0, 100));
    }

    console.log('\n=== 모든 테스트 완료 ===');
    console.log('브라우저를 30초간 열어둡니다. 직접 확인해보세요.');

    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ 테스트 실행 중 에러:', error);
  } finally {
    await browser.close();
    console.log('🔚 브라우저 종료');
  }
})();
