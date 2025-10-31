const CACHE_NAME = 'vocal-class-cache-v2';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/teacher.html',
    '/student.html',
    '/signature.html',
    '/tools.html',
    '/js/auth.js',
    '/js/teacher.js',
    '/js/student.js',
    '/js/signature.js',
    '/js/components.js'
    // Note: CSS files and external CDN resources are not cached to avoid CORS issues
];

// 1. 서비스 워커 설치 및 캐싱
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

// 2. 캐시 우선 네트워크 요청 처리 (Cache-First Strategy)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 캐시에 응답이 있으면 그것을 반환
                if (response) {
                    return response;
                }
                // 캐시에 없으면 네트워크에서 가져옴
                return fetch(event.request);
            })
    );
});

// 3. 오래된 캐시 정리
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 4. 푸시 알림 처리 (예시)
self.addEventListener('push', event => {
    const data = event.data.json();
    const title = data.title || 'Vocal Class';
    const options = {
        body: data.body,
        icon: '/images/icon-192x192.png', // manifest.json과 동일한 아이콘 사용
        badge: '/images/badge.png'
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// 5. 알림 클릭 시 동작
self.addEventListener('notificationclick', event => {
    event.notification.close();
    // 알림 클릭 시 특정 페이지로 이동
    event.waitUntil(
        clients.openWindow('/student.html')
    );
});
