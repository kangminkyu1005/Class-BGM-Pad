# Class BGM Pad

수업 중 강사가 자주 쓰는 BGM/효과음을 큰 버튼 하나로 바로 재생할 수 있는 앱입니다.
버튼을 누르면 음원이 재생되고, 휴대폰이 잠금화면 상태가 되어도 재생이 계속됩니다.

이 문서는 **처음 이 프로젝트를 받은 사람이 그대로 따라 하면 실행까지 갈 수 있도록** 작성했습니다.

---

## 0. 두 가지 실행 방식

이 프로젝트는 **하나의 코드베이스**로 두 가지 방식 중 골라서 쓸 수 있습니다.

| | 네이티브 앱 (Android/iOS) | 웹앱 (휴대폰 브라우저 링크) |
|---|---|---|
| 설치 | 앱 설치 필요 (Xcode/Android Studio로 빌드) | 설치 없이 URL 접속, "홈 화면에 추가"로 아이콘화 가능 |
| 재생 엔진 | `react-native-track-player` | HTML5 `<audio>` + Media Session API |
| 잠금화면 재생 안정성 | 높음 (OS 포그라운드 서비스) | 브라우저에 따라 다름. Android Chrome은 대체로 양호, **iOS Safari는 화면이 잠기면 재생이 끊길 수 있음** |
| 배포 | 앱스토어/플레이스토어 또는 EAS Build | Vercel 등 정적 호스팅 |

Firestore/Storage 연동, 화면 구성, 버튼 추가/수정/삭제 로직은 완전히 동일한 코드를 공유합니다. **오디오 재생 부분만** 플랫폼별로 다른 파일(`audioService.ts` vs `audioService.web.ts`)이 자동으로 선택됩니다 (Metro 번들러의 플랫폼 확장자 규칙).

네이티브 앱은 Expo Go에서 열리지 않습니다 (아래 이유). 웹앱은 이 문제와 무관하게 브라우저에서 바로 동작합니다.

- `react-native-track-player` : 잠금화면/백그라운드 재생을 위한 네이티브 모듈이라 Expo Go에 포함되어 있지 않음
- 따라서 네이티브 앱은 **커스텀 개발 빌드(Expo Dev Client)** 가 필요합니다 (아래 "3. 네이티브 앱으로 설치/실행하기" 참고)

---

## 1. 사전 준비물

- Node.js 20 이상, npm
- Android 실행: Android Studio (에뮬레이터) 또는 USB로 연결한 안드로이드 실기기
- iOS 실행: macOS + Xcode (iOS는 Mac에서만 빌드 가능합니다)
- Firebase 프로젝트 + **Blaze(종량제) 요금제** (Storage를 쓰려면 필수입니다 — 아래 2-1 참고. 무료 사용량 안에서는 과금되지 않습니다)

---

## 2. Firebase 설정

### 2-1. 프로젝트 생성

1. https://console.firebase.google.com 에서 새 프로젝트를 만듭니다.
2. 왼쪽 메뉴에서 **Firestore Database** 를 만듭니다. (프로덕션 모드로 시작해도 되고, 아래 2-4의 규칙을 붙여넣으면 됩니다.)
   > **중요**: 이 단계를 건너뛰면 앱에서 버튼 저장이 아무 에러 표시 없이 무한 로딩 상태로 멈춥니다 ("Cloud Firestore API has not been used ... or it is disabled" 403 에러). "데이터베이스 만들기" 버튼을 눌러 실제로 데이터베이스를 생성해야 합니다.
3. 왼쪽 메뉴에서 **Storage** 로 이동합니다.
   > **중요**: Storage는 무료 Spark 요금제로는 새로 시작할 수 없습니다 (Google 정책 변경, 2024년 말부터 적용). 화면에 "Storage 기능을 사용하려면 프로젝트의 요금제를 업그레이드하세요"가 보이면, **"프로젝트 업그레이드"** 를 눌러 **Blaze(종량제)** 로 전환하세요. 카드 등록이 필요하지만, 무료 제공량(저장 5GB, 다운로드 1GB/일 등) 안에서는 과금되지 않습니다. 업그레이드 후 다시 Storage 메뉴로 가서 **"시작하기"** 를 누르고 테스트 모드로 초기화합니다.

### 2-2. 웹 앱 등록 후 설정값 복사

1. 프로젝트 설정(톱니바퀴) > **일반** 탭으로 이동합니다.
2. "내 앱" 에서 **웹 앱(</>) 추가** 를 누릅니다. (React Native 프로젝트지만, Firebase JS SDK를 쓰기 때문에 "웹 앱"으로 등록하는 것이 맞습니다.)
3. 생성된 `firebaseConfig` 값(apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)을 복사해둡니다.

### 2-3. 환경변수 파일 만들기

프로젝트 루트의 `.env.example` 파일을 복사해서 `.env` 파일을 만들고, 위에서 복사한 값을 채워 넣습니다.

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

`.env` 파일은 `.gitignore`에 포함되어 있어 git에 올라가지 않습니다.

### 2-4. Firestore / Storage 보안 규칙 (MVP용)

MVP는 로그인 기능이 없습니다. 아래는 "개발/시연용" 규칙 예시입니다. **실제 배포 전에는 반드시 Firebase Authentication을 추가하고 규칙을 강화하세요.**

Firestore 규칙 (Firestore Database > 규칙):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bgmButtons/{buttonId} {
      allow read, write: if true; // TODO: 프로덕션에서는 인증된 사용자만 허용하도록 변경
    }
  }
}
```

Storage 규칙 (Storage > 규칙):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /bgm-audio/{fileName} {
      allow read, write: if true; // TODO: 프로덕션에서는 인증된 사용자만 허용하도록 변경
    }
  }
}
```

---

## 3. 네이티브 앱으로 설치/실행하기

```bash
# 1) 의존성 설치
npm install

# 2) 네이티브 프로젝트(android/ios 폴더) 생성
npx expo prebuild

# 3-a) Android로 실행 (에뮬레이터가 켜져 있거나 USB 기기가 연결되어 있어야 함)
npx expo run:android

# 3-b) iOS로 실행 (macOS 전용)
npx expo run:ios
```

최초 실행(`run:android` / `run:ios`) 이후에는 다음 명령으로 더 빠르게 개발 서버만 다시 띄울 수 있습니다.

```bash
npx expo start --dev-client
```

> Android 13 이상 기기에서는 최초 재생 시 "알림 표시" 권한을 허용해야 잠금화면 컨트롤이 정상적으로 보입니다.

---

## 4. 웹앱으로 배포하기 (휴대폰에서 링크로 접속)

빌드/설치 없이 **URL 하나로 휴대폰 브라우저에서 바로 쓰고 싶다면** 이 방법을 사용하세요. Vercel 배포를 기준으로 설명합니다.

### 4-1. 로컬에서 웹으로 먼저 확인 (선택)

```bash
npm install
npm run web            # 개발 서버 (브라우저에서 바로 확인)
# 또는
npm run build:web      # 정적 파일 빌드 → dist/ 폴더 생성 (expo export -p web)
```

### 4-2. Vercel에 배포하기

1. https://vercel.com 에서 이 GitHub 저장소를 Import 합니다.
2. 프로젝트에 이미 포함된 `vercel.json`이 빌드 설정을 자동으로 지정합니다.
   - Build Command: `npm run build:web`
   - Output Directory: `dist`
3. **Environment Variables** 에 `.env`와 동일한 값을 등록합니다. (`EXPO_PUBLIC_` 로 시작해야 빌드에 포함됩니다.)
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
   EXPO_PUBLIC_FIREBASE_PROJECT_ID
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   EXPO_PUBLIC_FIREBASE_APP_ID
   ```
4. Deploy를 누르면 `https://your-project.vercel.app` 같은 링크가 생성됩니다. 휴대폰 브라우저에서 그 링크로 접속하면 바로 사용할 수 있습니다.
5. (선택) 브라우저 메뉴의 **"홈 화면에 추가"** 를 사용하면 아이콘이 홈 화면에 생겨서 앱처럼 실행할 수 있습니다.

### 4-3. 웹앱의 한계 (꼭 읽어주세요)

- **iOS Safari**: 화면이 잠기거나 다른 앱으로 전환하면 오디오 재생이 끊길 수 있습니다. 브라우저 탭 자체가 백그라운드에서 정지되는 iOS의 정책 때문이며, 웹 표준만으로는 완전히 우회할 수 없습니다.
- **Android Chrome**: Media Session API 덕분에 잠금화면/알림에 재생 정보와 재생·일시정지·정지 컨트롤이 뜨고, 화면이 꺼져도 비교적 안정적으로 재생됩니다.
- 정말 "휴대폰이 잠겨 있어도 100% 끊김 없이 재생"이 중요하다면, 네이티브 앱(3번 항목, 또는 EAS Build로 만든 설치 파일) 사용을 권장합니다.
- **웹앱에서 음원 업로드/캐싱이 CORS 에러로 실패할 수 있습니다.** 브라우저 콘솔에 `has been blocked by CORS policy` / `Response to preflight request doesn't pass access control check` 같은 메시지가 보이면, Firebase Storage 버킷에 CORS 설정이 아직 없는 것입니다. **웹앱을 쓰는 이상 이 설정은 필수입니다** (건너뛰면 버튼 추가 시 파일 업로드가 항상 실패합니다).

  1. 아래 내용으로 `cors.json` 파일을 만듭니다. (업로드는 POST/PUT, 재생·캐싱은 GET을 쓰므로 여러 메서드를 허용해야 합니다.)
     ```json
     [
       {
         "origin": ["*"],
         "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
         "responseHeader": [
           "Content-Type",
           "Content-Length",
           "x-goog-resumable",
           "X-Goog-Upload-Protocol",
           "X-Goog-Upload-Command",
           "X-Goog-Upload-Status",
           "X-Goog-Upload-URL",
           "X-Goog-Upload-Offset",
           "X-Goog-Upload-Header-Content-Length",
           "X-Goog-Upload-Header-Content-Type"
         ],
         "maxAgeSeconds": 3600
       }
     ]
     ```
  2. 이 설정을 적용하려면 `gsutil` 명령이 필요합니다. 로컬에 Google Cloud SDK를 설치하지 않았다면, **Google Cloud Console의 Cloud Shell**(브라우저에서 바로 되는 터미널, 설치 불필요)을 쓰는 게 가장 쉽습니다.
     - https://console.cloud.google.com 접속 → 상단에서 Firebase와 같은 프로젝트 선택 → 우측 상단 `Cloud Shell 활성화(>_)` 아이콘 클릭
     - Cloud Shell에서 위 `cors.json` 내용을 붙여넣어 파일로 저장 (`nano cors.json` 등으로 편집)
     - 아래 명령 실행 (버킷 이름은 `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` 값과 동일):
       ```bash
       gsutil cors set cors.json gs://your-project.firebasestorage.app
       ```
     - 확인: `gsutil cors get gs://your-project.firebasestorage.app`
  3. 별도의 배포/재시작 없이 즉시 적용됩니다. 브라우저에서 새로고침 후 다시 시도하세요.

---

## 5. 폴더 구조

```
Class-BGM-Pad/
├─ App.tsx                      # 루트 컴포넌트: Provider(SafeArea, Player) + 네비게이션 조립
├─ index.ts                     # 네이티브 진입점: 루트 컴포넌트 등록 + 백그라운드 재생 서비스 등록
├─ index.web.ts                 # 웹 진입점: 루트 컴포넌트만 등록 (RNTP 관련 코드 없음)
├─ app.json                     # Expo 설정 (앱 이름, 권한, iOS 백그라운드 오디오 모드, 웹 메타데이터 등)
├─ vercel.json                  # Vercel 배포 설정 (빌드 명령/출력 폴더/SPA 라우팅)
├─ .env.example                 # Firebase 환경변수 템플릿 (.env로 복사해서 사용)
└─ src/
   ├─ config/
   │  └─ firebaseConfig.ts      # Firebase 앱 초기화, Firestore/Storage 인스턴스 export
   ├─ types/
   │  └─ index.ts                # BgmButton, PlayerStatus 등 앱 전역 타입 정의
   ├─ constants/
   │  ├─ theme.ts                # 색상/여백 등 디자인 토큰
   │  └─ buttonOptions.ts        # 버튼 색상/아이콘 프리셋, 추천 카테고리
   ├─ services/                  # 외부 시스템(파이어베이스/오디오/파일시스템/저장소)과의 연동 담당
   │  ├─ firestoreService.ts     # bgmButtons 컬렉션 CRUD + 실시간 구독
   │  ├─ storageService.ts       # Firebase Storage 업로드/삭제
   │  ├─ cacheService.ts         # (네이티브) 자주 쓰는 음원을 기기 파일시스템에 캐싱
   │  ├─ cacheService.web.ts     # (웹) 동일한 역할을 브라우저 Cache Storage API로 구현
   │  ├─ audioService.ts         # (네이티브) react-native-track-player 래퍼 (재생/정지/반복설정)
   │  ├─ audioService.web.ts     # (웹) HTML5 Audio + Media Session API로 동일 기능 구현
   │  ├─ playbackService.ts      # (네이티브 전용) 백그라운드/잠금화면 리모트 컨트롤 이벤트 처리
   │  └─ settingsService.ts      # 기본 반복/볼륨 설정을 AsyncStorage에 저장
   ├─ hooks/
   │  └─ useBgmButtons.ts        # Firestore 버튼 목록을 구독하는 커스텀 훅
   ├─ context/
   │  └─ PlayerContext.tsx       # 앱 전역 재생 상태(현재 재생 버튼, 재생/일시정지) 공유
   ├─ navigation/
   │  ├─ AppNavigator.tsx        # 화면 스택 네비게이션 정의
   │  └─ types.ts                # 네비게이션 파라미터 타입
   ├─ components/                # 여러 화면에서 재사용하는 UI 조각
   │  ├─ BgmButtonCard.tsx       # BGM 버튼 카드 (재생/수정 진입점)
   │  ├─ PlayerBar.tsx           # 현재 재생 중인 음원 표시 바
   │  ├─ CategoryFilter.tsx      # 카테고리 필터 칩
   │  ├─ StopAllButton.tsx       # 전체 정지 버튼
   │  ├─ ConfirmModal.tsx        # 삭제 등 확인이 필요한 동작에 쓰는 공용 모달
   │  ├─ ColorPicker.tsx / IconPicker.tsx   # 버튼 색상/아이콘 선택 UI
   │  ├─ VolumeSlider.tsx / LoopToggle.tsx  # 볼륨/반복재생 입력 UI
   │  ├─ PrimaryButton.tsx       # 공용 버튼(저장/삭제 등)
   │  └─ EmptyState.tsx          # 버튼이 하나도 없을 때 안내 화면
   ├─ screens/
   │  ├─ HomeScreen.tsx          # BGM 버튼 목록 (메인 화면)
   │  ├─ AddButtonScreen.tsx     # 새 버튼 추가
   │  ├─ EditButtonScreen.tsx    # 기존 버튼 수정/삭제
   │  └─ SettingsScreen.tsx      # 기본값 설정 + 캐시 관리
   └─ utils/
      └─ audioFile.ts            # 업로드 가능한 음원 확장자(mp3/wav/m4a) 검증
```

---

## 6. Firestore 데이터 구조

`bgmButtons` 컬렉션의 문서 하나 = 버튼 하나

| 필드 | 타입 | 설명 |
|---|---|---|
| title | string | 버튼 이름 |
| category | string | 카테고리 |
| audioUrl | string | Firebase Storage 다운로드 URL |
| storagePath | string | Storage 안의 실제 파일 경로 (삭제 시 사용) |
| loop | boolean | 반복 재생 여부 |
| volume | number | 기본 볼륨 (0~1) |
| color | string | 버튼 색상 (hex) |
| icon | string | 버튼 아이콘 (이모지) |
| createdAt | timestamp | 생성 시각 |
| updatedAt | timestamp | 수정 시각 |

---

## 7. MVP 범위

이번 버전(MVP)에 포함된 기능:

- Firebase(Firestore + Storage) 연동
- BGM 버튼 목록 실시간 불러오기 / 카테고리 필터
- 음원 파일(mp3/wav/m4a) 업로드
- 버튼 추가 / 수정 / 삭제(확인창 포함)
- 버튼을 누르면 재생, 다른 버튼을 누르면 기존 재생을 멈추고 전환
- 버튼별 반복 재생 ON/OFF
- 전체 정지
- 백그라운드/잠금화면 재생 + 재생/일시정지/정지 컨트롤 (네이티브 앱은 OS 수준, 웹앱은 Media Session API 수준)
- 자주 쓰는 음원 로컬 캐싱 (네이티브: 파일시스템 / 웹: 브라우저 Cache Storage)
- 네이티브 앱과 웹앱, 한 코드베이스로 동시 지원

다음 버전에서 고려할 수 있는 기능 (이번 MVP에는 미포함):

- 유튜브 링크(참고 링크로만 열기, 백그라운드 재생 X)
- 페이드 인 / 페이드 아웃 정지
- 즐겨찾기, 최근 사용한 BGM
- 음원 길이 표시
- 다중 사용자 로그인 및 권한 분리

---

## 8. 문제 해결

- **Firestore 목록이 안 보여요** → `.env`(또는 Vercel 환경변수) 값이 올바른지, Firestore 규칙이 읽기를 허용하는지 확인하세요.
- **파일 업로드가 안 돼요** → Storage 규칙, 그리고 네트워크 연결을 확인하세요.
- **잠금화면에서 소리가 끊겨요 (Android 네이티브 앱)** → 배터리 최적화 설정에서 이 앱을 "제한 없음"으로 설정해보세요. 제조사(삼성/샤오미 등)에 따라 백그라운드 앱을 강제 종료하는 정책이 있을 수 있습니다.
- **Expo Go로 실행하면 오류가 나요** → 정상입니다. 네이티브 앱은 네이티브 모듈을 포함하므로 위 "3. 네이티브 앱으로 설치/실행하기"대로 `expo run:android` / `expo run:ios`로 실행해야 합니다. (웹앱은 이 문제와 무관합니다.)
- **웹앱에서 화면을 잠그면 음악이 끊겨요 (특히 iPhone)** → iOS Safari의 알려진 제약입니다 (4-3절 참고). 끊김 없는 재생이 꼭 필요하면 네이티브 앱을 사용하세요.
- **웹앱에서 캐싱/재생 시 콘솔에 CORS 에러가 떠요** → Firebase Storage 버킷에 CORS 설정을 추가하세요 (4-3절의 `gsutil cors set` 참고).
