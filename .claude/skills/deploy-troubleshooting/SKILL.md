---
name: deploy-troubleshooting
description: Class BGM Pad 프로젝트의 GitHub push 권한 오류, Vercel 배포 시 Firebase 환경변수/Storage 버킷 오류를 진단하고 해결하는 가이드. "git push"가 403/permission denied로 실패하거나, 배포한 웹앱 콘솔에 "Firebase 환경변수가 설정되지 않았습니다" / "storage/no-default-bucket" 에러가 뜰 때 사용한다.
---

# Class BGM Pad 배포 문제 해결 가이드

이 프로젝트에서 실제로 발생했고 해결된 두 가지 문제와 그 해결 순서를 기록한다.
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

## 새로운 배포 문제를 진단할 때 공통 체크리스트

1. 브라우저/터미널에 찍힌 **정확한 에러 메시지 전문**을 먼저 확인한다 (요약하지 말고 그대로).
2. 그 에러가 **코드 문제**인지 **설정/권한 문제**인지 구분한다. `firebaseConfig.ts`, `cacheService(.web).ts`, `audioService(.web).ts` 같은 핵심 로직은 이미 타입체크와 `expo export -p web` / `-p android` 빌드로 검증되어 있으므로, 배포 후에만 나는 에러는 대부분 환경변수·권한 설정 쪽을 먼저 의심한다.
3. Vercel 관련이면 Settings → Environment Variables 를 스크린샷으로 확인하는 것이 가장 빠르다.
4. GitHub push/권한 관련이면 읽기(`git ls-remote`)와 쓰기(`git push`)를 분리해서 어느 쪽이 막혔는지 먼저 구분한다.
