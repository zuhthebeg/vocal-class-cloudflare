# Vocal Class WebApp

보컬 수업 관리를 위한 강사 및 수강생용 웹 애플리케이션 프로토타입입니다. 서버 없이 `localStorage`를 활용하여 데이터를 저장하며, PWA(Progressive Web App)를 지원합니다.

## 🚀 주요 기능

1.  **로그인 페이지 (`index.html`)**
    *   이름과 역할(강사/수강생)을 선택하여 로그인합니다.
    *   선택된 정보는 `localStorage`에 저장되며, 해당 역할의 메인 페이지로 이동합니다.

2.  **강사 메인 페이지 (`teacher.html`)**
    *   주간 가능한 시간을 설정하고 저장할 수 있습니다.
    *   수강생의 예약 현황 리스트를 확인합니다.
    *   "출석 QR 생성" 버튼을 통해 현재 세션 ID 기반의 QR 코드를 생성합니다.
    *   `Notification API`를 활용하여 수업 전 알림을 예약합니다.

3.  **수강생 메인 페이지 (`student.html`)**
    *   강사의 설정된 스케줄을 불러와 확인합니다.
    *   가능한 시간대를 클릭하여 수업을 신청하고 `localStorage`에 저장합니다.
    *   "출석하기" 버튼을 통해 서명 페이지로 이동합니다.

4.  **서명 페이지 (`signature.html`)**
    *   `<canvas>`를 이용하여 마우스 또는 터치로 서명할 수 있습니다.
    *   서명 데이터는 Base64 문자열로 변환되어 `localStorage`에 저장됩니다.
    *   **Google Sheets 연동**: 서명 제출 시 Google Sheets API를 통해 출석 정보가 자동으로 기록됩니다.

5.  **수업 도구 페이지 (`tools.html`)**
    *   **드로잉 보드**: `<canvas>`에서 색상, 굵기 변경이 가능한 드로잉 기능.
    *   **클립아트**: 미리 저장된 이미지를 드래그 앤 드롭하여 캔버스에 추가.
    *   **녹음기**: `MediaRecorder API`를 이용한 녹음, 재생, 속도 조절 기능.
    *   **예시 영상**: 제목과 YouTube URL을 등록하고, iframe으로 영상을 재생하며, 초성/키워드 검색 기능 제공.

6.  **PWA 지원**
    *   `manifest.json` 및 `service-worker.js`를 포함하여 오프라인 캐싱 및 알림 기능을 제공합니다.

## 🛠️ 기술 스택

*   HTML5
*   Vanilla JavaScript
*   TailwindCSS (또는 순수 CSS)
*   `localStorage` / `IndexedDB` (데이터 저장)
*   `qrcode.js` (QR 코드 생성)
*   `MediaRecorder API` (녹음 기능)
*   `Notification API` (알림 기능)
*   Google Apps Script (Google Sheets 연동)

## ⚙️ 로컬에서 실행하는 방법

1.  **프로젝트 클론**: Git을 사용하여 이 저장소를 로컬 컴퓨터로 클론합니다.
    ```bash
    git clone [저장소 URL]
    cd vocal-class-webapp
    ```

2.  **HTTP 서버 실행**: 웹 페이지는 파일 시스템에서 직접 열면 일부 기능(예: 서비스 워커)이 제대로 작동하지 않을 수 있습니다. 간단한 로컬 HTTP 서버를 실행해야 합니다.

    *   **Python 사용 (권장)**:
        ```bash
        python3 -m http.server 3000
        ```
    *   **Node.js 사용 (http-server 설치 필요)**:
        ```bash
        npm install -g http-server
        http-server -p 3000
        ```

3.  **브라우저 접속**: 웹 브라우저를 열고 `http://localhost:3000` 또는 `http://127.0.0.1:3000`으로 접속합니다.

### 로컬 출석 서버 (옵션)

프로젝트 루트에 간단한 Express 서버(`server.js`)를 추가했습니다. 이 서버는 출석 POST를 받아 `data/attendance.csv`에 저장합니다. 로컬에서 출석 연동을 테스트하려면:

1. 프로젝트 디렉토리로 이동
    ```powershell
    cd path\to\project
    ```
2. 의존성 설치 및 서버 시작
    ```powershell
    npm install
    npm start
    ```
   서버는 기본적으로 포트 `3001`에서 실행됩니다.

3. 앱은 기본적으로 `index.html`에서 `window.LOCAL_ATTENDANCE_ENDPOINT = 'http://localhost:3001/api/attendance'`로 설정되어 있어, 서명 제출 시 로컬 서버로 JSON POST가 전송됩니다.

4. 저장된 CSV는 `data/attendance.csv`에서 확인할 수 있습니다.

### Google Sheets 연동 (Google Apps Script)

`gapps/Code.gs` 예제가 포함되어 있습니다. 기본 흐름:

1. Google Sheets에서 새 스프레드시트를 생성하고 시트 ID를 복사합니다.
2. Apps Script 편집기에서 새 프로젝트를 만들고 `gapps/Code.gs` 내용을 붙여넣습니다.
3. `SHEET_ID`를 복사한 시트 ID로 교체합니다.
4. `Deploy` → `New deployment` → `Web app`으로 배포하고 접근 권한을 적절히 설정합니다.
5. 배포된 웹 앱 URL을 `window.GOOGLE_SCRIPT_URL`에 할당하면(예: `index.html`에 스크립트로 설정) 서명 제출 시 Google Sheets로 직접 전송됩니다.

## 🌐 GitHub Pages 배포

이 프로젝트는 GitHub Pages를 통해 쉽게 배포할 수 있는 구조로 되어 있습니다.

1.  **GitHub 저장소 생성**: 이 프로젝트 코드를 새로운 GitHub 저장소에 푸시합니다.

2.  **GitHub Pages 활성화**: 저장소 설정(Settings)에서 "Pages" 섹션으로 이동합니다.

3.  **소스 선택**: "Deploy from a branch"를 선택하고, `main` 브랜치와 `/ (root)` 폴더를 선택한 후 저장합니다.

4.  **배포 확인**: 몇 분 후 GitHub Pages URL (`your-username.github.io/your-repo-name/`)을 통해 웹앱에 접속할 수 있습니다.

## ⚠️ Google Sheets 연동 주의사항

`js/signature.js` 파일 내 `submitToGoogleSheet` 함수에 Google Apps Script 배포 URL이 `"https://script.google.com/macros/s/AKfycby.../exec"`와 같이 플레이스홀더로 설정되어 있습니다. **실제 Google Sheets 연동을 위해서는 이 URL을 사용자가 직접 배포한 Google Apps Script의 웹 앱 URL로 교체해야 합니다.**

Google Apps Script 배포 및 `doPost` 함수 구현에 대한 자세한 내용은 Google Developers 문서를 참고하세요.

추가 변경 및 구성 옵션:

- `js/signature.js`는 이제 DPR(디바이스 픽셀 비율)을 고려한 캔버스 스케일링을 적용합니다. 고해상도(레티나) 화면에서도 선이 선명하게 보입니다.
- 빈 캔버스 판별 로직을 추가하여 사용자가 서명하지 않은 경우 제출을 차단합니다.
- 원격 전송을 기본으로 강제하지 않고, 다음 전송 옵션을 지원합니다:
    - window.GOOGLE_SCRIPT_URL: Google Apps Script 웹앱 URL을 전역으로 설정하면 자동으로 해당 URL로 POST 전송합니다.
    - window.LOCAL_ATTENDANCE_ENDPOINT: 로컬/서버 엔드포인트가 있을 경우 이 값을 설정하면 해당 엔드포인트로 JSON을 POST합니다.
    - 아무것도 설정하지 않으면 출석 정보는 `localStorage`에만 저장되고, 사용자에게 로컬 저장 완료 알림을 표시합니다.

예시: index.html 또는 별도 설정 스크립트에서 다음을 추가하세요:

```html
<script>
    window.GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/your_deployed_id/exec';
    // 또는
    // window.LOCAL_ATTENDANCE_ENDPOINT = 'https://example.com/api/attendance';
</script>
```

녹음기 개선:

- `js/recorder.js`에 녹음 후 재생기 UI에 "다운로드" 버튼이 추가되어 녹음 파일을 `.webm`으로 저장할 수 있습니다.

## 📝 프로젝트 구조

```
.  
├── index.html          # 로그인 페이지
├── teacher.html        # 강사 메인 페이지
├── student.html        # 수강생 메인 페이지
├── signature.html      # 서명 페이지
├── tools.html          # 수업 도구 페이지
├── manifest.json       # PWA 매니페스트 파일
├── service-worker.js   # PWA 서비스 워커
├── css/
│   └── style.css       # 사용자 정의 CSS 스타일
└── js/
    ├── auth.js         # 인증 및 사용자 관리 로직
    ├── teacher.js      # 강사 페이지 로직
    ├── student.js      # 수강생 페이지 로직
    ├── signature.js    # 서명 페이지 로직 (Google Sheets 연동 포함)
    ├── drawing.js      # 드로잉 보드 로직
    ├── recorder.js     # 녹음기 로직
    ├── examples.js     # 예시 영상 관리 로직
    └── qrcode.min.js   # QR 코드 생성 라이브러리
```
