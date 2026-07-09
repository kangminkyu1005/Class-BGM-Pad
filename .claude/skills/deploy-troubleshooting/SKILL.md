---
name: deploy-troubleshooting
description: Class BGM Pad 프로젝트의 GitHub push 권한 오류, Vercel 배포 시 Firebase 환경변수/Storage 버킷 오류, 웹앱에서 음원 업로드 시 CORS 오류, Firebase Storage 버킷이 존재하지 않는(Blaze 요금제 필요) 오류, 웹에서 저장/삭제 실패 시 아무 메시지도 안 뜨고 스피너가 멈추지 않는 문제, 재배포했는데도 브라우저에 예전 화면이 그대로 보이는(캐시) 문제, 파일은 Storage에 실제로 올라갔는데 웹 화면은 계속 업로드 중으로 멈춰있는(resumable 업로드 CORS 헤더 노출) 문제를 진단하고 해결하는 가이드. "git push"가 403/permission denied로 실패하거나, 배포한 웹앱 콘솔에 "Firebase 환경변수가 설정되지 않았습니다" / "storage/no-default-bucket" / "has been blocked by CORS policy" 에러가 뜨거나, gsutil이 "The specified bucket does not exist"를 내거나, 웹에서 버튼 추가/수정/삭제가 조용히 실패(에러 문구 없이 로딩만 계속됨)하거나, 최신 커밋을 배포했는데도 변경사항이 반영 안 되거나, Storage에는 파일이 올라갔는데 업로드 진행률이 100%에서 멈춰있을 때 사용한다.
---

# Class BGM Pad 배포 문제 해결 가이드

이 프로젝트에서 실제로 발생했고 해결된 문제들과 그 해결 순서를 기록한다.
같은 증상이 다시 나타나면 아래 순서대로 진단한다.

## 문제 1: `git push`가 403 / permission denied로 실패

### 증상
```
fatal: unable to access '.../git/...': The requested URL returned error: 403
Permission to <owner>/<repo>.git denied to <user>
```
`git ls-remote`(읽기)는 되는데 `git push`(쓰기)만 거부되는 경우, 네트워크 문제가 아니라 **권한 문제**다. 재시도해도 해결되지 않는다.

### 원인
세션에 연결된 GitHub 인증이 해당 저장소에 대해 read-only 상태이거나, Claude용 GitHub App이 그 저장소/조직에 설치되어 있지 않은 경우.

### 해결 방법
1. GitHub에서 **Claude(Claude Code / Claude in GitHub) App**을 설치한다.
   - 저장소 소유자(또는 조직 관리자)가 GitHub의 App 설치 페이지에서 대상 저장소(또는 전체 저장소)에 대해 App을 설치/승인해야 한다.
   - Claude 쪽 GitHub 연동 설정(claude.ai 관리 설정의 GitHub 섹션)에서도 저장소 접근 범위를 확인한다.
2. 설치/권한 부여가 끝나면 별도 재인증 없이 바로 `git push -u origin <branch>`를 다시 시도한다.
3. 여전히 403이면:
   - `git remote -v`로 원격 URL이 올바른 저장소를 가리키는지 확인
   - `git ls-remote origin`으로 읽기 권한부터 확인 (이것도 안 되면 저장소 접근 자체가 아직 승인 안 된 것)

### 이 프로젝트에서 실제 있었던 일
최초 `git push -u origin claude/class-bgm-pad-app-87zyry`가 `Permission ... denied` 로 실패했고, 사용자가 GitHub에 Claude App을 설치한 뒤 동일한 명령을 재시도하자 바로 성공했다. 코드나 git 설정을 바꿀 필요는 전혀 없었다.

---

## 문제 2: 배포한 웹앱에서 Firebase 관련 에러

### 증상 (브라우저 콘솔)
```
[firebaseConfig] Firebase 환경변수가 설정되지 않았습니다. .env 파일을 만들고 EXPO_PUBLIC_FIREBASE_* 값을 채워주세요.
```
그리고/또는
```
FirebaseError: Firebase Storage: No default bucket found. Did you set the 'storageBucket'
property when initializing the app? (storage/no-default-bucket)
```

### 원인
`src/config/firebaseConfig.ts`는 `process.env.EXPO_PUBLIC_FIREBASE_*` 값으로 Firebase를 초기화한다. 이 값들은 **빌드 시점에 번들에 그대로 박히는 값**(Expo의 `EXPO_PUBLIC_` 접두사 규칙)이라, 배포 플랫폼(Vercel)에 환경변수가 등록되어 있지 않으면 전부 `undefined`로 빌드되고, 그중에서도 `storageBucket`이 비어있으면 `getStorage()`가 이 에러를 던진다.

가장 흔한 원인은 **Vercel 프로젝트의 Environment Variables가 비어 있는 것** ("No Environment Variables Added" 상태) — 즉 로컬 `.env` 파일만 만들고 Vercel 대시보드에는 아직 등록을 안 한 경우다.

### 해결 방법 (Vercel 기준)
1. Vercel 대시보드 → 해당 프로젝트 → **Settings → Environment Variables** 로 이동.
2. 아래 6개를 정확한 이름(대소문자 포함, 오타 없이)으로 추가한다. 값은 Firebase 콘솔 → 프로젝트 설정 → 일반 → "내 앱"(웹 앱)의 `firebaseConfig` 객체에서 그대로 복사한다.
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
   EXPO_PUBLIC_FIREBASE_PROJECT_ID
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   EXPO_PUBLIC_FIREBASE_APP_ID
   ```
   - `storageBucket` 값에 `gs://` 접두사를 붙이지 않는다. (`프로젝트ID.firebasestorage.app` 또는 `프로젝트ID.appspot.com` 형식 그대로)
   - 각 변수마다 **Production / Preview / Development** 세 환경을 모두 체크한다. (화면에 "Production" 같은 환경 필터가 걸려 있으면 다른 환경에만 등록된 것처럼 보일 수 있으니 필터를 확인한다.)
3. **저장 후 반드시 재배포한다.** `EXPO_PUBLIC_*` 값은 빌드 시점에 인라인되므로, 환경변수를 저장하는 것만으로는 이미 만들어진 배포에 반영되지 않는다.
   - Deployments 탭 → 최신 배포의 "..." 메뉴 → **Redeploy** (가능하면 "Use existing Build Cache" 해제)
4. 재배포가 끝나면 **그 새 배포의 URL**로 접속해 콘솔 경고가 사라졌는지 확인한다.

### 로컬 개발 환경에서 같은 에러가 나면
- 프로젝트 루트에 `.env`가 있는지 확인 (`.env.example`을 복사해서 만든다).
- `.env`를 새로 만들거나 수정했다면 `npx expo start`를 완전히 재시작해야 한다 (핫리로드로는 반영되지 않음).

### 이 프로젝트에서 실제 있었던 일
Vercel에 처음 배포했을 때 환경변수를 아예 등록하지 않은 상태였다. 콘솔에서 "Firebase 환경변수가 설정되지 않았습니다" 경고와 `storage/no-default-bucket` 에러를 확인 → Vercel Settings → Environment Variables 화면이 "No Environment Variables Added"로 비어있는 것을 스크린샷으로 확인 → 6개 `EXPO_PUBLIC_FIREBASE_*` 변수를 추가하고 재배포해서 해결했다.

---

## 문제 3: 웹앱에서 음원 업로드/캐싱이 CORS 에러로 실패

### 증상 (브라우저 콘솔)
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/<bucket>/...'
from origin 'https://<프로젝트>.vercel.app' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check: It does not have HTTP ok status.

POST https://firebasestorage.googleapis.com/v0/b/<bucket>/... net::ERR_FAILED
```
버튼 추가 화면에서 "저장" 시 업로드가 0%에서 멈추고 실패한다.

### 원인
Firebase Storage 버킷은 기본적으로 어떤 웹 출처(origin)에서도 브라우저 fetch/XHR로 직접 접근하는 것을 허용하지 않는다(CORS 미설정 상태). 네이티브 앱은 이 문제가 없지만(브라우저가 아니므로 CORS 자체가 적용 안 됨), **웹앱은 반드시 버킷에 CORS 설정을 해줘야** `uploadBytesResumable`(업로드)과 `fetch`(캐싱)가 동작한다. 환경변수 문제(문제 2)와 별개로, 이건 한 번은 꼭 해줘야 하는 필수 설정이다.

### 해결 방법
1. `cors.json` 파일 작성 (업로드는 POST/PUT, 재생·캐싱은 GET을 쓰므로 여러 메서드를 허용해야 한다):
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
   (`method`에 `GET`만 넣으면 캐싱 fetch는 되지만 업로드는 여전히 실패한다 — 반드시 POST/PUT도 포함해야 한다.)
2. `gsutil`이 필요하다. 로컬에 Google Cloud SDK가 없다면 **Google Cloud Console의 Cloud Shell** (설치 불필요, 브라우저 터미널)을 쓴다:
   - https://console.cloud.google.com → Firebase와 동일한 프로젝트 선택 → 우측 상단 Cloud Shell 아이콘(`>_`) 클릭
   - Cloud Shell에서 `cors.json`을 만들고(`nano cors.json` 등) 위 내용을 붙여넣는다.
   - 버킷 이름(`EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` 값, 보통 `프로젝트ID.firebasestorage.app`)으로 적용:
     ```bash
     gsutil cors set cors.json gs://<bucket-name>
     ```
   - 확인: `gsutil cors get gs://<bucket-name>`
3. 재배포는 필요 없다. 브라우저를 새로고침하고 다시 시도하면 바로 반영된다.

### 이 프로젝트에서 실제 있었던 일
Vercel 배포(`https://class-bgm-pad.vercel.app`)에서 버튼 추가 시 음원 업로드가 `POST .../v0/b/class-bgm-pad.firebasestorage.app/...` 요청에서 CORS로 막혀 실패했다 (`ERR_FAILED`, "has been blocked by CORS policy"). README 4-3절에 미리 적어둔 CORS 안내가 `method: ["GET"]`만 포함하고 있어 업로드(POST/PUT)에는 불충분했던 것을 확인 → 위처럼 GET/HEAD/PUT/POST/DELETE를 모두 포함하도록 README와 이 문서를 함께 수정했다.

---

## 문제 4: `gsutil`/`gcloud storage`에서 "버킷이 존재하지 않는다"고 나옴 (Storage가 Blaze 요금제 필요)

### 증상
```
NotFoundException: 404 The specified bucket does not exist.
```
또는 `gcloud storage buckets list`가 프로젝트에 버킷을 하나도 안 보여줌(`Listed 0 items.`).

Firebase 콘솔 → Storage 화면에는 파일 목록 대신 다음 문구가 보인다:
```
Storage 기능을 사용하려면 프로젝트의 요금제를 업그레이드하세요.
[프로젝트 업그레이드]
```

### 원인
2024년 말부터 **Cloud Storage for Firebase는 새로 시작할 때 무료 Spark 요금제로는 기본 버킷을 만들 수 없고, Blaze(종량제) 요금제가 필요하다.** Storage를 한 번도 초기화하지 않은 프로젝트는 버킷 자체가 아예 존재하지 않으므로, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`에 어떤 값을 넣어도(추측이든 정확한 값이든) 업로드/CORS 설정 전부 실패한다.

### 해결 방법
1. Firebase 콘솔 → 프로젝트 → **Storage** → **"프로젝트 업그레이드"** 클릭 → 결제 계정(카드) 연결 → **Blaze**로 전환.
   - 무료 제공량(저장 5GB, 다운로드 1GB/일 등)은 Spark와 동일하게 유지되며, 초과분만 과금된다. 이 앱 규모(교사 1인의 수업용 BGM)에서는 사실상 무료 범위 안에 머문다.
   - 예상치 못한 과금이 걱정되면 Google Cloud Console → **결제 → 예산 및 알림**에서 예산 알림을 걸어둔다.
2. 업그레이드 완료 후 다시 Storage 메뉴로 이동 → **"시작하기"** → 보안 규칙은 "테스트 모드로 시작" 선택 → 리전 선택 → 완료.
3. 버킷이 생성되면 Storage 화면 상단에 정확한 버킷 이름(`gs://프로젝트ID.firebasestorage.app` 형태)이 표시된다. 이 값을:
   - Vercel `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` 환경변수에 정확히 넣고 재배포한다.
   - `gsutil cors set cors.json gs://<그 버킷 이름>` (문제 3) 을 이 시점에 실행한다.

### 참고: Cloud Shell에서 `gcloud storage`가 이상한 인증 에러를 낼 때
```
Regional Access Boundary HTTP request failed after retries: ... 'Gaia id not found for email ...'
```
이런 계정 인식 오류가 나면 최신 `gcloud storage` 명령 대신 구버전 `gsutil ls` / `gsutil cors set`을 써본다. 그래도 안 되면 Cloud Shell 메뉴(⋮) → "Cloud Shell 재시작" 후 재시도한다. 근본 원인(버킷 자체가 없음)은 CLI 인증과 무관하므로, 이런 에러가 나도 결국 위 1~2단계(Blaze 업그레이드 + Storage 초기화)를 먼저 해결해야 한다.

### 이 프로젝트에서 실제 있었던 일
Cloud Shell에서 `gsutil cors set ... gs://class-bgm-pad.firebasestorage.app`이 "bucket does not exist"로 실패 → `gcloud storage buckets list`도 0개 반환(도중에 Gaia ID 인증 에러도 겹침) → Firebase 콘솔 Storage 화면을 직접 확인하니 "프로젝트 업그레이드" 안내가 떠 있었고, Spark 요금제라 Storage가 아예 초기화되지 않은 상태였음을 확인 → Blaze로 업그레이드 후 Storage "시작하기"로 버킷을 생성 → 그 버킷 이름으로 CORS 설정(문제 3) 및 Vercel `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` 값을 맞추고 재배포 → **버튼 추가 화면에서 음원 업로드가 실제로 성공하는 것까지 확인**해서 완전히 해결됐다.

---

## Firebase Storage를 새로 쓰는 웹앱을 처음부터 설정할 때 (권장 순서)

문제 2·3·4는 서로 원인이 다르지만 실제로는 **하나의 흐름 안에서 순서대로** 부딪히기 쉽다. 새 프로젝트를 처음 배포할 때는 아래 순서로 미리 진행하면 각 문제를 하나씩 따로 겪지 않아도 된다.

1. Firebase 프로젝트 생성 → Firestore 생성 (여기까지는 무료 Spark로 충분, 문제 없음).
2. **Storage를 열어 Blaze로 업그레이드하고 "시작하기"로 버킷을 실제로 생성한다** (문제 4). 이 단계를 건너뛰면 이후 모든 게 실패한다.
3. Storage 화면에 표시된 **정확한 버킷 이름**을 확인한다.
4. 그 버킷 이름으로 **CORS를 설정한다** (문제 3) — `gsutil cors set cors.json gs://<버킷 이름>`.
5. Vercel(또는 다른 배포 환경)에 **6개 `EXPO_PUBLIC_FIREBASE_*` 환경변수**를 등록한다 (문제 2) — `STORAGE_BUCKET` 값이 3번에서 확인한 이름과 정확히 일치해야 한다.
6. **재배포**한다 (환경변수는 저장만으로는 반영되지 않는다).
7. 배포된 링크에서 브라우저 콘솔을 열어둔 채로 버튼을 하나 추가해보고, 업로드가 100%까지 끝나는지 직접 확인한다.

이 순서를 지키면 "버킷 없음 → CORS 에러 → 환경변수 에러"를 번갈아 겪는 대신 한 번에 끝낼 수 있다.

---

## 문제 5: 웹에서 저장/삭제가 실패해도 에러 메시지가 하나도 안 뜨고 로딩만 계속됨

### 증상
버튼 추가 화면에서 업로드 진행률이 100%까지 간 뒤 "저장" 버튼이 계속 로딩 스피너 상태로 멈춰 있다. 브라우저 콘솔에도 별다른 알림창(팝업)이 뜨지 않는다. 이 상태에서 새로고침하면 방금 추가하려던 버튼이 목록에 없다(=애초에 저장이 끝난 적이 없다).

### 원인
`react-native-web`의 `Alert.alert()`는 **완전히 빈 구현**이다 (`class Alert { static alert() {} }`). 즉 네이티브에서는 잘 뜨는 `Alert.alert('저장 실패', ...)` 같은 코드가 **웹에서는 아무 일도 하지 않는다.** 코드 자체는 정상적으로 catch 블록까지 도달해서 `finally`로 로딩 상태를 풀어줘야 하는데, 만약 그 사이에 실제 에러가 나더라도 사용자는 그걸 볼 방법이 전혀 없어서 "그냥 멈춘 것처럼" 보인다. (업로드가 진짜로 응답 없이 멈추는 경우까지 겹치면 `finally`조차 실행되지 않아 스피너가 영원히 남는다.)

### 해결 방법 (이미 이 프로젝트에 적용됨)
1. `src/utils/alert.ts`의 `showAlert(title, message)` 헬퍼를 만들어, 웹에서는 `window.alert(...)`을 쓰고 네이티브에서는 `Alert.alert(...)`을 쓰도록 분기했다. 화면 코드에서 `Alert.alert(...)`을 직접 쓰지 않고 반드시 `showAlert(...)`를 쓴다.
2. 버튼이 여러 개인 확인창(예: 캐시 비우기)은 `Alert.alert(title, message, [버튼들])` 대신, 이미 있는 `ConfirmModal` 컴포넌트(순수 React Native `Modal` 기반이라 웹에서도 정상 동작)를 재사용하도록 바꿨다.
3. `storageService.ts`의 업로드 로직에 **60초 타임아웃**을 추가했다 — 그 시간 안에 업로드가 끝나지도 에러가 나지도 않으면 강제로 취소하고 명확한 에러 메시지로 실패시킨다. 원인이 무엇이든(CORS, 네트워크, SDK 내부 재시도 루프 등) 화면이 무한 로딩으로 남지 않게 하는 안전장치다.
4. 저장/삭제 실패 시 `showAlert`에 **실제 에러 메시지(`error.message`)를 그대로 포함**시켜서, 다음에 비슷한 문제가 생기면 화면에서 바로 원인을 읽을 수 있게 했다.

### 주의: 새 화면/기능을 추가할 때
- 절대 `import { Alert } from 'react-native'`로 직접 `Alert.alert(...)`를 호출하지 않는다. 항상 `src/utils/alert.ts`의 `showAlert`를 쓴다.
- 버튼이 여러 개 필요한 확인창은 `ConfirmModal` 패턴을 따른다.
- 시간이 걸릴 수 있는 네트워크 작업(업로드/다운로드 등)에는 타임아웃을 걸어서, 실패해도 UI가 응답 없는 상태로 멈추지 않게 한다.

### 이 프로젝트에서 실제 있었던 일
버튼 추가 시 업로드가 100%에서 멈춘 채로 저장 버튼이 계속 로딩 상태였고, 새로고침하면 그 버튼이 사라졌다(=저장이 실제로 끝난 적이 없었다). 원인을 찾다가 `react-native-web`의 `Alert.alert`가 완전히 빈 함수라는 걸 확인 → 모든 화면의 `Alert.alert` 호출을 `showAlert` 헬퍼로 교체하고, 업로드에 60초 타임아웃을 추가하고, 캐시 비우기 확인창은 `ConfirmModal`로 교체해서 해결했다. 같은 김에 HomeScreen의 카드 수정 진입 방법도 길게 누르기(모바일 전용, 웹 마우스에선 불안정)만 있던 것을 연필 아이콘 버튼으로 보강했다.

---

## 문제 6: 코드를 고쳐서 재배포했는데 브라우저에는 예전 화면 그대로 보임

### 증상
Vercel Deployments에서 최신 커밋(해시 일치)이 배포된 걸 확인했는데도, 실제 배포된 링크를 열면 고친 내용이 하나도 안 보이고 예전 동작(예: 예전 UI, 고쳤던 버그가 그대로 재현)이 그대로 나온다.

### 원인
`vercel.json`에 캐시 관련 `headers` 설정이 없으면, Vercel이 정적 파일(특히 `index.html`)을 브라우저/엣지에 필요 이상으로 오래 캐시할 수 있다. Expo 웹 빌드는 실제 JS 번들 파일명에 콘텐츠 해시가 붙어 매번 바뀌지만(`index-<hash>.js`), 그 파일을 가리키는 `index.html` 자체가 캐시되어 버리면 브라우저는 새 배포가 있어도 계속 예전 `index.html`(→ 예전 JS 파일)을 불러온다.

### 해결 방법
1. `vercel.json`에 `headers` 규칙을 추가해 `index.html`(그리고 라우팅되는 모든 경로)은 항상 새로 받아오게 하고, 해시가 붙은 정적 자산(`/_expo/static/...`)만 장기 캐시하도록 분리한다:
   ```json
   {
     "headers": [
       {
         "source": "/(.*)",
         "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }]
       },
       {
         "source": "/_expo/static/(.*)",
         "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
       }
     ]
   }
   ```
   (뒤에 오는 더 구체적인 규칙이 같은 헤더 키를 덮어쓰므로, 해시 붙은 자산만 예외적으로 장기 캐시된다.)
2. 이 설정을 넣은 뒤 다시 배포한다.
3. 그래도 예전 화면이 보이면, 코드/배포 문제가 아니라 **브라우저가 이미 캐시해둔 예전 파일**을 보고 있는 것이다. 하드 리프레시(Ctrl+Shift+R / Cmd+Shift+R)를 하거나 시크릿 창으로 열어서 확인한다.
4. Deployments 탭에서 그 커밋 배포가 정말 **현재 접속 중인 도메인(Production)에 연결**되어 있는지도 확인한다 — Preview 배포와 Production 배포는 URL이 다르다.

### 이 프로젝트에서 실제 있었던 일
문제 5(Alert.alert 등)를 고쳐서 배포했는데, Vercel Deployments에서 해당 커밋(`c5a6353`)이 정확히 배포된 걸 확인했음에도 사용자 화면에는 수정 전 동작이 그대로 보였다. `vercel.json`에 캐시 헤더 설정이 없었던 것을 원인으로 보고 위 `headers` 규칙을 추가했다.

---

## 문제 7: 파일은 실제로 Storage에 올라가는데 웹 화면은 계속 "업로드 중 100%"에서 멈춤

### 증상
- 버튼 추가 화면에서 진행률이 100%까지 가고 저장 버튼이 계속 로딩 상태로 멈춘다 (문제 5의 60초 타임아웃을 넣은 뒤에도 재현됨).
- Firebase 콘솔 → Storage에 들어가 보면 **파일은 실제로 올라가 있다.** 즉 업로드 자체는 서버 쪽에서 성공했다.
- 개발자 도구 Network 탭에서 `firebasestorage.googleapis.com`으로 가는 요청을 보면, **preflight(OPTIONS) 요청만 200으로 성공**하고 그 뒤에 이어져야 할 실제 업로드 요청이 안 보이거나, 있어도 클라이언트가 완료를 인식하지 못한다.
- preflight 응답 헤더를 까보면:
  ```
  Access-Control-Allow-Methods: POST, GET, HEAD, DELETE, PATCH
  Access-Control-Expose-Headers: Content-Range, X-Firebase-Storage-XSRF
  ```
  `X-Goog-Upload-Status`, `X-Goog-Upload-URL` 같은, 재개 가능한(resumable) 업로드 프로토콜이 필요로 하는 헤더들이 `Access-Control-Expose-Headers`에 없다.

### 원인
`uploadBytesResumable()`(재개 가능한 업로드)은 여러 요청에 걸쳐 진행되며, 각 단계마다 서버 응답의 커스텀 헤더(`X-Goog-Upload-Status` 등)를 읽어서 "다음에 뭘 해야 하는지/끝났는지"를 판단한다. 그런데 **Firebase Storage REST API(`firebasestorage.googleapis.com`) 자체의 CORS 정책은 이 헤더들을 `Access-Control-Expose-Headers`로 노출하지 않는다.** 이건 GCS 버킷 레벨 CORS(문제 3에서 `gsutil cors set`으로 설정한 것)와는 **완전히 별개**의, Firebase가 자체적으로 고정해둔 CORS 정책이라 버킷 CORS를 아무리 고쳐도 해결되지 않는다.

결과: 파일 바이트 자체는 정상적으로 서버에 전달되어 업로드가 "실제로는" 끝나지만, 브라우저의 JS 코드는 완료 여부를 알려주는 헤더를 CORS 때문에 읽지 못해서 완료 신호를 영원히 받지 못한다 → 클라이언트 쪽에서만 무한 대기 상태로 보인다.

### 해결 방법 (이미 이 프로젝트에 적용됨)
웹에서만 `uploadBytesResumable` 대신 **`uploadBytes()`(단일 요청 멀티파트 업로드)** 를 쓰도록 `src/services/storageService.web.ts`를 새로 만들었다. `uploadBytes`는 POST 요청 하나로 끝나고 완료 여부를 응답 **바디(JSON)** 로 확인하는데, 응답 바디를 읽는 건 `Access-Control-Expose-Headers`와 무관하게 항상 허용되므로 이 문제 자체가 발생하지 않는다. (대신 세밀한 업로드 진행률(%)은 못 보여주고 시작/완료만 표시한다 — 음원 파일 크기 정도에서는 크게 문제되지 않는다.)

네이티브(`storageService.ts`)는 이 CORS 문제가 없으므로(브라우저가 아니라 CORS 자체가 적용 안 됨) 그대로 `uploadBytesResumable`을 유지해 업로드 진행률을 계속 보여준다.

### 진단 순서 요약 (다음에 비슷한 걸 겪으면)
1. Firebase 콘솔 Storage에서 **파일이 실제로 올라갔는지** 먼저 확인한다. 올라가 있으면 서버 문제가 아니라 클라이언트가 완료를 인식 못 하는 문제다.
2. Network 탭에서 preflight 요청을 클릭해 **Access-Control-Expose-Headers**에 SDK가 필요로 하는 헤더가 빠져있는지 확인한다.
3. `uploadBytesResumable` 대신 `uploadBytes`로 바꿔서 재현되는지 본다.

### 이 프로젝트에서 실제 있었던 일
문제 5(60초 타임아웃)를 넣은 뒤에도 웹에서 업로드가 계속 100%에서 멈췄다. Network 탭을 `firebasestorage`로 필터링해보니 preflight만 200으로 성공하고 실제 요청이 안 보였고, 사용자가 Firebase 콘솔에서 파일이 실제로는 올라가 있는 것을 확인했다. preflight 응답의 `Access-Control-Expose-Headers`에 `X-Goog-Upload-*` 계열 헤더가 없는 것을 확인 → 웹 전용 `storageService.web.ts`를 만들어 `uploadBytes`로 교체해서 해결했다.

---

## 문제 8: 업로드(문제 7 수정 후)에도 저장이 계속 안 끝남 — Firestore 쓰기 멈춤 의심

### 증상
- 문제 7 수정(`uploadBytes` 전환) 배포 후에도 저장이 무한 로딩. 파일은 Storage에 올라간다.
- 새로고침하면 버튼이 목록에서 사라진다 = **Firestore 문서 쓰기가 서버에 끝내 커밋되지 않았다**는 뜻. (버튼이 저장 직후 목록에 잠깐 보이는 건 Firestore의 낙관적 로컬 반영일 수 있어서, "보였다가 새로고침 후 사라짐"은 오히려 쓰기 미커밋의 전형적 신호다.)
- Network 탭에서 Firestore의 `channel?VER=8...` 요청(읽기 스트림)은 200으로 잘 흐른다 — **읽기는 되는데 쓰기만 안 되는** 상태일 수 있다.

### 원인 (가설과 대응)
Firestore의 기본 전송(WebChannel 스트리밍)은 일부 프록시/보안 소프트웨어/광고 차단 확장 환경에서 **쓰기 응답만 무한 버퍼링**되는 알려진 문제가 있다. 이 경우 `addDoc`/`updateDoc`은 에러 없이 영원히 대기한다(서버 ack를 기다리므로). 공식 해결책은 `initializeFirestore(app, { experimentalForceLongPolling: true })`.

### 적용한 대응 (3가지를 한 번에)
1. **웹에서 Firestore long-polling 강제**: `firebaseConfig.ts`에서 `getFirestore` 대신 `initializeFirestore(app, Platform.OS === 'web' ? { experimentalForceLongPolling: true } : {})`. fast refresh로 재초기화될 때를 대비해 try/catch로 `getFirestore` 폴백.
2. **저장 파이프라인 단계 표시**: 저장 중 화면에 "음원 파일 읽는 중... → 음원 업로드 중... → 다운로드 주소 확인 중... → 버튼 정보 저장 중..." 단계를 그대로 표시. 멈추면 **어느 단계에서 멈췄는지 화면만 보고 알 수 있다.** (이 텍스트가 안 보이고 예전 "업로드 중... 100%"만 보이면 아직 옛 번들을 보고 있는 것 — 문제 6 참조)
3. **Firestore 쓰기 타임아웃**: `addDoc`/`updateDoc`/`deleteDoc`을 20초 타임아웃으로 감싸서, 쓰기가 멈추면 원인 안내 문구(확장 프로그램/프록시 의심, 다른 네트워크로 시도 등)를 alert로 표시.

### 진단 순서 (다음에 같은 증상이 나오면)
1. 화면의 단계 문구를 읽는다:
   - "음원 업로드 중..."에서 멈춤 → Storage 문제 (문제 3/7 방향)
   - "버튼 정보 저장 중..."에서 멈춤/타임아웃 → Firestore 쓰기 문제 (이 문제) → 광고 차단 확장 끄기, 시크릿 창, 다른 네트워크(휴대폰 데이터)로 교차 확인
2. 20초 후 뜨는 타임아웃 alert 문구를 그대로 수집한다.
3. 교차 확인에서 다른 네트워크로는 되면 네트워크(프록시/방화벽) 문제로 확정.

### 이 프로젝트에서 실제 있었던 일
문제 7 수정 배포(a86b30a) 후에도 사용자 환경에서 저장이 계속 멈췄다. 파일은 Storage에 올라가고 새로고침하면 버튼이 사라지는 패턴에서 Firestore 쓰기 미커밋을 의심 → 위 3가지(롱폴링 강제 + 단계 표시 + 쓰기 타임아웃)를 한 번에 적용했다. 배포 후 단계 표시 덕분에 "버튼 정보 저장" 단계에서 20초 타임아웃이 발생하는 것이 화면에 그대로 확인됐다 — **Firestore 쓰기 멈춤으로 확정**. 그러나 `experimentalForceLongPolling`으로도 해결되지 않아, 최종적으로 문제 9(REST API 쓰기 전환)로 해결했다.

---

## 문제 9: forceLongPolling으로도 Firestore 쓰기가 안 됨 → 웹 쓰기를 REST API로 전환 (최종 해결)

### 증상
문제 8의 대응(롱폴링 강제)을 배포한 뒤에도, 단계 표시가 "버튼 정보 저장 중..."에서 멈추고 20초 타임아웃 알림이 떴다. 즉 이 네트워크에서는 Firestore SDK의 전송(WebChannel)으로는 어떤 설정을 해도 쓰기가 서버에 도달하지 못한다.

### 판단 근거
- 같은 네트워크에서 **Storage 업로드(단순 POST fetch)는 성공**한다 → 일반적인 HTTPS POST는 통과된다.
- Firestore **읽기(onSnapshot 실시간 구독)는 동작**한다 → 문제는 오직 SDK의 쓰기 스트림.
- 결론: SDK의 특수한 스트리밍 전송만 막히는 환경이므로, 쓰기를 **단순 HTTP 요청(Firestore REST API)** 으로 바꾸면 통과된다.

### 해결 방법 (이미 이 프로젝트에 적용됨)
`src/services/firestoreService.web.ts`를 만들어 웹에서만:
- **읽기**: SDK `onSnapshot` 유지 (실시간 갱신 동작 확인됨)
- **쓰기(추가/수정/삭제)**: `https://firestore.googleapis.com/v1/projects/<PID>/databases/(default)/documents/...`에 fetch로 직접 POST/PATCH/DELETE
- 값은 REST 형식(`{stringValue}`, `{doubleValue}`, `{booleanValue}`, `{timestampValue}`)으로 인코딩. `serverTimestamp()` 대신 클라이언트 시각(`new Date().toISOString()`)을 timestampValue로 사용 (이 앱에서 시각은 정렬용이라 충분).
- **주의: PATCH(수정)에는 반드시 `updateMask.fieldPaths=...`를 붙여야 한다.** 안 붙이면 문서 전체가 교체되어, 이번에 안 보낸 필드(음원 교체 없이 수정 시 audioUrl/storagePath)가 삭제된다.
- REST 쓰기도 보안 규칙을 동일하게 적용받고, 실패 시 HTTP 상태코드가 에러 알림에 그대로 표시되므로 진단이 쉽다.

### 교훈
"읽기는 되는데 쓰기만 조용히 멈춘다"면 SDK 설정을 계속 만지는 것보다, **같은 네트워크에서 확실히 통과되는 방식(단순 fetch)이 무엇인지 확인하고 그 방식으로 우회**하는 것이 빠르다. Storage 업로드 성공이 그 증거 역할을 했다.

---

## 새로운 배포 문제를 진단할 때 공통 체크리스트

1. 브라우저/터미널에 찍힌 **정확한 에러 메시지 전문**을 먼저 확인한다 (요약하지 말고 그대로).
2. 그 에러가 **코드 문제**인지 **설정/권한 문제**인지 구분한다. `firebaseConfig.ts`, `cacheService(.web).ts`, `audioService(.web).ts` 같은 핵심 로직은 이미 타입체크와 `expo export -p web` / `-p android` 빌드로 검증되어 있으므로, 배포 후에만 나는 에러는 대부분 환경변수·권한·CORS 설정 쪽을 먼저 의심한다.
3. Vercel 관련이면 Settings → Environment Variables 를 스크린샷으로 확인하는 것이 가장 빠르다.
4. GitHub push/권한 관련이면 읽기(`git ls-remote`)와 쓰기(`git push`)를 분리해서 어느 쪽이 막혔는지 먼저 구분한다.
5. 콘솔에 "blocked by CORS policy"가 보이면 문제 2(환경변수)가 아니라 문제 3(버킷 CORS 설정)이다 — 둘을 헷갈리지 않는다.
6. `gsutil`/`gcloud`가 "bucket does not exist"를 내면 CORS 설정(문제 3)보다 먼저 문제 4(Storage가 아예 초기화 안 됨/Blaze 요금제 필요)를 의심하고, Firebase 콘솔 Storage 화면을 직접 확인한다.
7. **웹에서** 뭔가 저장/삭제가 "그냥 멈춘 것처럼" 보이고 에러 팝업이 안 뜨면, 진짜 아무 문제가 없는 게 아니라 문제 5(`Alert.alert`가 웹에서 무음)일 가능성이 크다 — 코드에 `Alert.alert`가 새로 추가되지 않았는지부터 확인한다.
8. **재배포했는데 화면이 그대로**면, 먼저 Vercel Deployments에서 배포된 커밋 해시가 최신인지 확인한다. 커밋은 맞는데 화면이 그대로면 코드 문제가 아니라 문제 6(캐싱)이다 — 하드 리프레시/시크릿 창으로 먼저 확인하고, `vercel.json`의 `headers` 캐시 설정을 점검한다.
9. **업로드가 웹에서 100%에서 안 끝나면**, 타임아웃 에러 알림이 뜨는지 먼저 기다려보고, Firebase 콘솔에서 파일이 실제로 올라갔는지 확인한다. 파일은 올라갔는데 화면만 멈춰있다면 문제 3(CORS 미설정)이 아니라 문제 7(resumable 업로드의 CORS 헤더 노출 문제)이다 — 버킷 CORS를 아무리 고쳐도 소용없고, `uploadBytes`로 바꿔야 한다.
10. 화면 단계 표시가 **"버튼 정보 저장 중..."에서 타임아웃**되면 Firestore 쓰기 문제다(문제 8→9). SDK 설정(롱폴링 등)으로 안 풀리면 웹 쓰기는 이미 REST API로 전환되어 있으니(firestoreService.web.ts), 에러 알림에 표시되는 HTTP 상태코드를 읽는다 — 403이면 보안 규칙, 타임아웃이면 네트워크가 firestore.googleapis.com 자체를 차단하는 것.
