// functions/_middleware.ts
// 정적 파일은 Functions를 거치지 않고 바로 제공

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // 정적 파일은 그대로 통과 (Functions 처리 안 함)
  const staticExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  const isStatic = staticExtensions.some(ext => pathname.endsWith(ext));

  if (isStatic) {
    // env.ASSETS를 통해 정적 파일 가져오기
    return context.env.ASSETS.fetch(context.request);
  }

  // API 라우트는 다음 핸들러로
  if (pathname.startsWith('/api/')) {
    return context.next();
  }

  // 루트 경로는 index.html
  if (pathname === '/' || pathname === '') {
    return context.env.ASSETS.fetch(new Request(new URL('/index.html', context.request.url)));
  }

  // 그 외는 다음 핸들러로
  return context.next();
};
