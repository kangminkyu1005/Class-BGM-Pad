---
name: deploy-troubleshooting
description: Class BGM Pad 프로젝트의 GitHub push 권한 오류, Vercel 배포 시 Firebase 환경변수/Storage 버킷 오류, 웹앱에서 음원 업로드 시 CORS 오류, Firebase Storage 버킷이 존재하지 않는(Blaze 요금제 필요) 오류를 진단하고 해결하는 가이드. "git push"가 403/permission denied로 실패하거나, 배포한 웹앱 콘솔에 "Firebase 환경변수가 설정되지 않았습니다" / "storage/no-default-bucket" / "has been blocked by CORS policy" 에러가 뜨거나, gsutil이 "The specified bucket does not exist"를 낼 때 사용한다.
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

## 새로운 배포 문제를 진단할 때 공통 체크리스트

1. 브라우저/터미널에 찍힌 **정확한 에러 메시지 전문**을 먼저 확인한다 (요약하지 말고 그대로).
2. 그 에러가 **코드 문제**인지 **설정/권한 문제**인지 구분한다. `firebaseConfig.ts`, `cacheService(.web).ts`, `audioService(.web).ts` 같은 핵심 로직은 이미 타입체크와 `expo export -p web` / `-p android` 빌드로 검증되어 있으므로, 배포 후에만 나는 에러는 대부분 환경변수·권한·CORS 설정 쪽을 먼저 의심한다.
3. Vercel 관련이면 Settings → Environment Variables 를 스크린샷으로 확인하는 것이 가장 빠르다.
4. GitHub push/권한 관련이면 읽기(`git ls-remote`)와 쓰기(`git push`)를 분리해서 어느 쪽이 막혔는지 먼저 구분한다.
5. 콘솔에 "blocked by CORS policy"가 보이면 문제 2(환경변수)가 아니라 문제 3(버킷 CORS 설정)이다 — 둘을 헷갈리지 않는다.
6. `gsutil`/`gcloud`가 "bucket does not exist"를 내면 CORS 설정(문제 3)보다 먼저 문제 4(Storage가 아예 초기화 안 됨/Blaze 요금제 필요)를 의심하고, Firebase 콘솔 Storage 화면을 직접 확인한다.
