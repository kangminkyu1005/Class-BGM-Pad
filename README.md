# Class BGM Pad

수업 중 강사가 자주 쓰는 BGM/효과음을 큰 버튼 하나로 바로 재생할 수 있는 앱입니다.
버튼을 누르면 음원이 재생되고, 휴대폰이 잠금화면 상태가 되어도 재생이 계속됩니다.

이 문서는 **처음 이 프로젝트를 받은 사람이 그대로 따라 하면 실행까지 갈 수 있도록** 작성했습니다.

---

## 0. 이 앱이 "Expo Go"로는 실행되지 않는 이유

이 앱은 다음 두 가지 때문에 **커스텀 개발 빌드(Expo Dev Client)** 가 필요합니다. 일반 Expo Go 앱에서는 열리지 않습니다.

- `react-native-track-player` : 잠금화면/백그라운드 재생을 위한 네이티브 모듈
- Firebase 관련 라이브러리들은 JS SDK라 자체로는 문제없지만, 위 오디오 모듈 때문에 어차피 네이티브 빌드가 필요합니다.

따라서 아래 "3. 실행 방법"에서는 `npx expo run:android` / `npx expo run:ios` 로 실행합니다. (최초 1회는 시간이 좀 걸립니다.)

---

## 1. 사전 준비물

- Node.js 20 이상, npm
- Android 실행: Android Studio (에뮬레이터) 또는 USB로 연결한 안드로이드 실기기
- iOS 실행: macOS + Xcode (iOS는 Mac에서만 빌드 가능합니다)
- Firebase 프로젝트 (무료 Spark 요금제로 충분)

---

## 2. Firebase 설정

### 2-1. 프로젝트 생성

1. https://console.firebase.google.com 에서 새 프로젝트를 만듭니다.
2. 왼쪽 메뉴에서 **Firestore Database** 를 만듭니다. (프로덕션 모드로 시작해도 되고, 아래 2-4의 규칙을 붙여넣으면 됩니다.)
3. 왼쪽 메뉴에서 **Storage** 를 활성화합니다.

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

## 3. 설치 및 실행 방법

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

## 4. 폴더 구조

```
Class-BGM-Pad/
├─ App.tsx                      # 루트 컴포넌트: Provider(SafeArea, Player) + 네비게이션 조립
├─ index.ts                     # 앱 진입점: 루트 컴포넌트 등록 + 백그라운드 재생 서비스 등록
├─ app.json                     # Expo 설정 (앱 이름, 권한, iOS 백그라운드 오디오 모드 등)
├─ .env.example                 # Firebase 환경변수 템플릿 (.env로 복사해서 사용)
└─ src/
   ├─ config/
   │  └─ firebaseConfig.ts      # Firebase 앱 초기화, Firestore/Storage 인스턴스 export
   ├─ types/
   │  └─ index.ts                # BgmButton 등 앱 전역 타입 정의
   ├─ constants/
   │  ├─ theme.ts                # 색상/여백 등 디자인 토큰
   │  └─ buttonOptions.ts        # 버튼 색상/아이콘 프리셋, 추천 카테고리
   ├─ services/                  # 외부 시스템(파이어베이스/오디오/파일시스템/저장소)과의 연동 담당
   │  ├─ firestoreService.ts     # bgmButtons 컬렉션 CRUD + 실시간 구독
   │  ├─ storageService.ts       # Firebase Storage 업로드/삭제
   │  ├─ cacheService.ts         # 자주 쓰는 음원을 기기에 캐싱, 오프라인 재생 안정성 확보
   │  ├─ audioService.ts         # react-native-track-player 래퍼 (재생/정지/반복설정)
   │  ├─ playbackService.ts      # 백그라운드/잠금화면 리모트 컨트롤 이벤트 처리
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

## 5. Firestore 데이터 구조

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

## 6. MVP 범위

이번 버전(MVP)에 포함된 기능:

- Firebase(Firestore + Storage) 연동
- BGM 버튼 목록 실시간 불러오기 / 카테고리 필터
- 음원 파일(mp3/wav/m4a) 업로드
- 버튼 추가 / 수정 / 삭제(확인창 포함)
- 버튼을 누르면 재생, 다른 버튼을 누르면 기존 재생을 멈추고 전환
- 버튼별 반복 재생 ON/OFF
- 전체 정지
- 백그라운드/잠금화면 재생 + 잠금화면 재생/일시정지/정지 컨트롤
- 자주 쓰는 음원 로컬 캐싱 (네트워크 불안정 대비)

다음 버전에서 고려할 수 있는 기능 (이번 MVP에는 미포함):

- 유튜브 링크(참고 링크로만 열기, 백그라운드 재생 X)
- 페이드 인 / 페이드 아웃 정지
- 즐겨찾기, 최근 사용한 BGM
- 음원 길이 표시
- 다중 사용자 로그인 및 권한 분리

---

## 7. 문제 해결

- **Firestore 목록이 안 보여요** → `.env` 값이 올바른지, Firestore 규칙이 읽기를 허용하는지 확인하세요.
- **파일 업로드가 안 돼요** → Storage 규칙, 그리고 네트워크 연결을 확인하세요.
- **잠금화면에서 소리가 끊겨요 (Android)** → 배터리 최적화 설정에서 이 앱을 "제한 없음"으로 설정해보세요. 제조사(삼성/샤오미 등)에 따라 백그라운드 앱을 강제 종료하는 정책이 있을 수 있습니다.
- **Expo Go로 실행하면 오류가 나요** → 정상입니다. 이 앱은 네이티브 모듈을 포함하므로 위 "3. 설치 및 실행 방법"대로 `expo run:android` / `expo run:ios`로 실행해야 합니다.
