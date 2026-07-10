# Class BGM Pad 문제 해결 가이드

이 문서는 Class BGM Pad를 설치·배포하다가 문제가 생겼을 때, **개발 지식이 없어도 따라할 수 있도록** 만든 가이드입니다. 여기 나온 문제들은 전부 이 앱을 처음 배포할 때 실제로 발생했고 해결된 것들입니다.

## 시작하기 전에: 문제 해결의 기본 규칙

1. **에러 메시지를 그대로 읽으세요.** 요약하거나 추측하지 말고, 화면/알림창에 뜬 문구 전체를 확인합니다. 이 문서는 그 문구로 검색하도록 만들어져 있습니다.
2. **브라우저 개발자 도구를 여는 법**: 키보드에서 `F12`를 누르고 상단의 **Console** 탭을 클릭하면 숨은 에러가 보입니다.
3. 웹앱에서 뭔가 이상하면 먼저 **시크릿 창(Ctrl+Shift+N)** 으로 열어서 다시 확인해보세요. 브라우저에 저장된 예전 파일 때문에 생기는 문제를 걸러낼 수 있습니다.

---

## 증상으로 찾기

| 증상 / 에러 문구 | 바로가기 |
|---|---|
| "Firebase 환경변수가 설정되지 않았습니다" | [1번](#1-firebase-환경변수가-설정되지-않았습니다) |
| "No default bucket found (storage/no-default-bucket)" | [1번](#1-firebase-환경변수가-설정되지-않았습니다) |
| 버튼 저장이 무한 로딩 + 새로고침하면 사라짐 | [2번](#2-저장이-무한-로딩되고-새로고침하면-사라져요-가장-흔함) |
| "Cloud Firestore API has not been used ... or it is disabled" (403) | [2번](#2-저장이-무한-로딩되고-새로고침하면-사라져요-가장-흔함) |
| "has been blocked by CORS policy" | [3번](#3-cors-에러가-떠요) |
| "The specified bucket does not exist" | [4번](#4-storage-버킷이-없다고-해요--storage-화면에-업그레이드하라고-떠요) |
| Storage 화면에 "요금제를 업그레이드하세요" | [4번](#4-storage-버킷이-없다고-해요--storage-화면에-업그레이드하라고-떠요) |
| 코드를 고쳐 재배포했는데 화면이 그대로예요 | [5번](#5-재배포했는데-예전-화면이-그대로-보여요) |
| `git push`가 403 / permission denied | [6번](#6-git-push가-거부돼요-403) |
| 휴대폰 잠금화면에서 음악이 끊겨요 | [7번](#7-잠금화면에서-음악이-끊겨요) |

---

## 1. "Firebase 환경변수가 설정되지 않았습니다"

**증상**: 앱을 열면 콘솔에 이 경고가 뜨고, 목록이 안 나오거나 저장 시 `storage/no-default-bucket` 에러가 납니다.

**원인**: 배포 서비스(Vercel)에 Firebase 접속 정보(환경변수)가 등록되지 않았습니다.

**해결**:
1. Vercel 대시보드 → 프로젝트 → **Settings → Environment Variables**
2. 아래 6개를 추가합니다 (이름 오타 주의, 값은 Firebase 콘솔 → 프로젝트 설정 → 일반 → "내 앱"의 웹 앱 설정에서 복사):
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
   EXPO_PUBLIC_FIREBASE_PROJECT_ID
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   EXPO_PUBLIC_FIREBASE_APP_ID
   ```
3. 각 변수마다 Production / Preview / Development **셋 다 체크**하고 저장합니다.
4. **반드시 재배포합니다** (Deployments 탭 → 최신 배포의 "..." → Redeploy). 환경변수는 저장만 해서는 반영되지 않습니다.

---

## 2. 저장이 무한 로딩되고, 새로고침하면 사라져요 (가장 흔함!)

**증상**: 버튼을 저장하면 "버튼 정보 저장 중..."에서 멈추거나, 403 에러 알림에 **"Cloud Firestore API has not been used in project ... before or it is disabled"** 라고 나옵니다. 음원 파일은 Firebase Storage에 올라가는데, 새로고침하면 버튼이 목록에서 사라집니다.

**원인**: Firebase 프로젝트에 **Firestore 데이터베이스를 만들지 않았습니다.** (Storage만 만들고 이 단계를 건너뛰면 정확히 이 증상이 납니다.)

**해결**:
1. https://console.firebase.google.com → 프로젝트 선택
2. 왼쪽 메뉴 **Firestore Database** → **"데이터베이스 만들기"** 클릭
3. 위치는 `asia-northeast3`(서울) 권장, **테스트 모드로 시작** 선택
4. 생성 후 **규칙** 탭에서 아래로 교체하고 게시:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /bgmButtons/{buttonId} {
         allow read, write: if true;
       }
     }
   }
   ```
5. 1~2분 뒤 다시 시도합니다. **앱 재배포는 필요 없습니다.**

---

## 3. CORS 에러가 떠요

**증상**: 콘솔에 `has been blocked by CORS policy` / `Response to preflight request doesn't pass access control check`가 뜨고 업로드나 재생이 실패합니다.

**원인**: Firebase Storage 버킷에 "웹 브라우저에서의 접근 허용(CORS)" 설정이 없습니다. 웹으로 쓰는 이상 **한 번은 꼭 해줘야 하는 설정**입니다.

**해결**:
1. https://console.cloud.google.com 접속 → 상단에서 Firebase와 **같은 프로젝트** 선택 (프로젝트 이름을 꼭 확인!)
2. 우측 상단 **Cloud Shell 아이콘(`>_`)** 클릭 (설치 없이 브라우저에서 터미널이 열립니다)
3. 아래를 통째로 붙여넣어 설정 파일을 만듭니다:
   ```bash
   cat > cors.json << 'EOF'
   [
     {
       "origin": ["*"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "responseHeader": [
         "Content-Type", "Content-Length", "x-goog-resumable",
         "X-Goog-Upload-Protocol", "X-Goog-Upload-Command", "X-Goog-Upload-Status",
         "X-Goog-Upload-URL", "X-Goog-Upload-Offset",
         "X-Goog-Upload-Header-Content-Length", "X-Goog-Upload-Header-Content-Type"
       ],
       "maxAgeSeconds": 3600
     }
   ]
   EOF
   ```
4. 버킷 이름(Firebase 콘솔 Storage 화면 상단의 `gs://...` 값)으로 적용:
   ```bash
   gsutil cors set cors.json gs://여기에-버킷-이름
   ```
5. 재배포 없이 새로고침하면 바로 적용됩니다.

---

## 4. Storage 버킷이 없다고 해요 / Storage 화면에 업그레이드하라고 떠요

**증상**: `gsutil`이 `The specified bucket does not exist`라고 하거나, Firebase 콘솔의 Storage 화면에 "Storage 기능을 사용하려면 프로젝트의 요금제를 업그레이드하세요"가 보입니다.

**원인**: Firebase Storage는 (2024년 말 정책 변경 이후) **무료 Spark 요금제로는 새로 시작할 수 없습니다.** Blaze(종량제)로 올려야 버킷이 생성됩니다.

**해결**:
1. Firebase 콘솔 → Storage → **"프로젝트 업그레이드"** → 카드 등록 후 **Blaze**로 전환
   - 무료 제공량(저장 5GB, 다운로드 1GB/일)은 그대로라서, 이 앱 규모에서는 사실상 계속 무료입니다.
   - 걱정되면 Google Cloud Console → 결제 → **예산 및 알림**에서 알림을 걸어두세요.
2. 다시 Storage 메뉴 → **"시작하기"** → 테스트 모드로 초기화
3. 화면에 표시되는 버킷 이름(`gs://...`)을 확인하고, 그 값이 Vercel의 `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`과 같은지 확인하세요 (다르면 고치고 재배포).
4. 이어서 위 [3번](#3-cors-에러가-떠요)의 CORS 설정도 해주세요.

---

## 5. 재배포했는데 예전 화면이 그대로 보여요

**증상**: 분명히 새 버전을 배포했는데(Vercel에서 최신 커밋 확인됨) 화면은 바뀐 게 없습니다.

**원인**: 브라우저가 예전 파일을 캐시(저장)해두고 계속 쓰고 있는 것입니다.

**해결**:
1. **Ctrl+Shift+R** (Mac: Cmd+Shift+R)로 강력 새로고침
2. 그래도 안 되면 **시크릿 창**으로 열어서 확인
3. Vercel Deployments에서 최신 배포의 커밋이 정말 내가 올린 것인지, 그 배포가 Production 도메인에 연결됐는지도 확인

(이 저장소의 `vercel.json`에는 이 문제를 줄이는 캐시 설정이 이미 들어 있습니다.)

---

## 6. git push가 거부돼요 (403)

**증상**: `Permission to <저장소>.git denied` 또는 403 에러로 push가 실패합니다. 읽기(clone/pull)는 됩니다.

**원인**: GitHub에 Claude App(또는 사용하는 도구의 App)이 설치되지 않았거나, 해당 저장소에 쓰기 권한이 없습니다.

**해결**: GitHub에서 해당 App을 저장소에 설치/승인한 뒤 push를 다시 시도하세요. 코드나 설정을 바꿀 필요는 없습니다.

---

## 7. 잠금화면에서 음악이 끊겨요

- **iPhone(사파리) 웹앱**: 화면이 잠기면 재생이 끊길 수 있습니다. 이것은 iOS의 정책이라 웹앱으로는 완전히 해결할 수 없습니다. 끊김 없는 재생이 꼭 필요하면 네이티브 앱 버전(README 3번)을 사용하세요.
- **Android(크롬) 웹앱**: 대체로 화면이 꺼져도 재생이 유지되고, 잠금화면에 재생/일시정지 컨트롤이 뜹니다.
- **Android 네이티브 앱**: 그래도 끊기면 설정 → 배터리에서 이 앱을 "제한 없음"으로 바꿔보세요.

---

## 그래도 해결이 안 되면

1. `F12` → Console 탭의 **에러 문구 전체**와, 문제가 나는 **화면을 캡처**해두세요.
2. 이 저장소를 Claude Code로 열고 문제를 설명하면, 이 가이드의 상세 버전(`.claude/skills/deploy-troubleshooting/`)을 참고해 진단해줍니다.
3. 새로운 문제를 해결했다면, 다음 사람을 위해 이 문서에도 추가해주세요.
