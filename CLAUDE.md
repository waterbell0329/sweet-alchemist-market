# Sweet Alchemist Market — Classroom Command Center

이미 완성되어 동작하는 프로젝트. 처음부터 다시 만들지 말고 이 코드를 기준으로 이어서 작업한다.

## 개요
- 인도네시아 스마랑 초등학교 4학년(22명)·6학년(30명) 대상 75분 오프라인 경제 보드게임의 교실 전광판 SPA
- 앱은 시간·시세·투자 추첨·경제 뉴스·연출만 담당. 학생별 코인 잔액·레시피 소유는 추적하지 않음 (교사가 실물 확인)
- 서버/DB/인터넷 없이 동작, 상태는 localStorage 저장
- 스택: React 18 + TypeScript + Vite 5 + Tailwind 3 + Zustand 5 + lucide-react + canvas-confetti + Vitest, 효과음은 Web Audio 합성

## 상태
- `npm test`: 8개 파일, 84개 테스트 통과
- `npm run build`, `npm run build:single` 성공. `dist-single/index.html`은 file://로도 동작
- 1920×1080 확인 완료: 대시보드, 튜토리얼, 뉴스, 결과 모달, 투자 마감/추첨 알림, Last Call, 마켓 마감, 시상식, ko/id/병기, 관람 모드. 콘솔 에러 0
- 미확인: 실제 기기 효과음 청취

## 구조
```
src/
├── data/        gameConfig, recipes, investments(확률), events(뉴스 4종 + 중앙 스케줄)
├── engine/      timerEngine, eventScheduler, investmentEngine, marketEngine, craftingRules, soundEngine
├── i18n/        ko.ts(키 원본), id.ts(Record<TKey,Entry>로 키 강제), index.ts(translate, 복수형, 누락 감지)
├── store/       gameStore.ts(createGameStore 팩토리 + 싱글톤, applyClock), persistence.ts, types.ts
├── hooks/       useGameClock(200ms), useKeyboardShortcuts, useAudioUnlock, useStageScale, useTeacherActions, useT
├── components/  Header, GameTimer, TimelineBar, MarketPanel, MaterialPriceRow, CraftingTree, RecipeCard,
│                InvestmentPanel, RoundTracker, GachaMachine, GachaResultModal, BreakingNewsModal, NoticeHost,
│                NewsMenu, TutorialModal, AwardsScreen, EventTicker, Overlays, ErrorBoundary, ui.tsx,
│                SideNav, TaskStrip
├── utils/       eventText.ts
└── tests/       investment, timer, scheduler, market, i18n, crafting, store, persistence
```

## 핵심 설계 (깨뜨리지 말 것)
1. **타이머**: `{running, anchorWallMs, anchorRemainingMs}` 앵커 방식(드리프트 없음). 표시 초는 ceil. 범위 0~4500 클램프.
2. **이벤트 스케줄러**: `findCrossedEvents(prevSec, curSec, executed)`는 하강 교차만 발동. 실행 ID 저장, 재발동 없음. 점프로 건너뛴 이벤트는 `skipped: true`로 notice 큐에 쌓임. 정렬은 시간순, 같은 시각이면 priority(phase 0~1, roundClose 2, roundDraw 3, news 5).
3. **notice 큐**: NoticeHost는 큐 맨 앞 하나만 표시. 가챠 결과 모달 우선. [나중에]는 `snoozedNotice` 사용.
4. **투자 라운드**: R1~R5 close = 3900/3300/2700/2100/1500, draw = close −600.
   흐름: upcoming → open → closed → waiting(교사 [예치 확정]) → drawable → drawing → drawn
5. **가챠**: crypto Uint32 + 거부 샘플링으로 0~99. 구간 0–14 / 15–34 / 35–64 / 65–89 / 90–99. 1 Gold 투자 시 반환 2/4/6/10/15.
   결과는 `spin()` 안에서 먼저 확정·기록한 뒤 2.5초 애니메이션. 새로고침하면 spinning은 revealed로 복원.
   일괄 모드는 라운드당 1회. 개별 모드는 중복 시 확인창, 기존 기록은 voided 처리 후 재추첨.
6. **가격 우선순위**: 활성 뉴스(seq 큰 쪽) > 수동 설정(sale 1 / normal 2 / shortage 4) > 기본가. 뉴스 만료는 게임 시간 기준(일시정지 중 멈춤).
7. **복원 규칙**: 새로고침 시 항상 일시정지, savedAt 시점의 남은 시간으로 복귀(지나간 시간 진행 안 함). 저장 키 `sweet-alchemist-market:v1`, 타이머 동작 중 1초 단위 저장.
8. **화면**: 1920×1080 `.stage`를 transform scale로 맞춤. 모달은 top 196px 아래(타이머 항상 보이게).
9. **화면 구성**: 왼쪽 세로 메뉴 `SideNav`(시세/제작/투자, 키 1·2·3, `screen` 상태는 비저장) + 그 오른쪽에 한 화면만 표시. 크기는 `LAYOUT`(gameConfig) 상수.
   **크기 조절**: `uiScale`(저장, 리셋에도 유지) 단계 `UI_SCALES` 0.9/1/1.15/1.3/1.5, 메뉴 하단 −/+ 버튼과 `[` `]` 키. 헤더·메뉴·배너는 고정, 내용 화면만 확대: App이 논리 크기(mainW/z × mainH/z)로 그린 뒤 `transform: scale(z)`. 실제 배율은 `contentZoom(screen, uiScale)` = 기본배율×uiScale을 화면별 상한 `ZOOM_MAX`(시세 1.5, 제작 1.3, 투자 1.4; 투자 기본 1.3)로 자름. 제작 화면은 티어 3줄 가로 배치이고 슬롯 크기를 논리 크기에서 계산(`CraftingTree w/h`). 레이아웃 바꾸면 5단계×3화면×(투자 띠 유무)×3언어 넘침 검사 필요.
10. **이벤트 카드**(`NoticeHost`): 예정된 순간마다 화면 중앙에 큰 카드 1장 + 다음 단계 주 버튼(Enter도 같은 동작, `sam:primary` 이벤트). 안내용(마켓 오픈·뉴스·Last Call·마감)은 12초 뒤 자동 닫힘(진행 바 표시), 투자 마감[예치 확정]·종료[시상식]는 버튼 대기. **추첨 시각은 카드 없이 가챠 풀화면(`GachaStage`, `gachaStage` 상태·비저장)이 자동으로 열림** — 같은 초의 다른 카드(예: 다음 라운드 마감)는 그 위에 표시. 일괄 추첨은 결과 확인 시 무대가 닫히고 투자 화면으로, 개별 추첨은 교사가 [대시보드로]/Esc로 닫음. 무대가 열려 있으면 메인 화면은 렌더하지 않음(가챠 머신 2개가 동시에 S 키에 반응하는 것 방지). 투자 화면 제목줄에 [가챠 크게 보기] 버튼. 투자 카드의 [나중에]는 `deferNotice`로 `skipped: true`가 되어 하단 `TaskStrip`으로 감(`isTaskNotice`+skipped만 띠에 표시). 점프로 건너뛴 뉴스·phase는 카드 없이 소비. 할 일 대기 중 20초 무조작+타이머 진행 중이면 투자 화면으로 자동 이동(`useAutoFollow`).
11. **튜토리얼**: 규칙 설명 10장(`TUTORIAL_SLIDES`). 슬라이드 수를 바꾸면 이 상수만 고치면 됨(키보드·저장 검증이 참조).
   **규칙 원칙(사용자 지시)**: 학생에게 설명하는 규칙은 원래 제품이 다루는 규칙만. 앱 데이터·기존 문구에 없는 규칙(거래 예절, 시상 기준, 생활 약속 등)을 지어내지 말 것.
12. **줄바꿈**: `index.css`에서 한국어 `word-break: keep-all`, Bi 글자 `text-wrap: balance`, 병기 모드 한국어 보조 글자는 `inline-block`(줄 중간에서 갈라지지 않음). 픽셀 글꼴에는 →가 없으니 화살표는 일반 글꼴 span으로.

## 코딩 규칙 / 함정
- UI 문자열은 `ko.ts`와 `id.ts` 양쪽에 같은 키로 추가 (i18n 테스트가 키·플레이스홀더 일치 검사). JSX 하드코딩 금지.
- 표시는 `<Bi k=... p=... />`. 병기 모드는 인니어 크게, 한국어 작게. 언어별로 다른 파라미터는 `kp`(keyParams).
- `btn-${tone}`, `coin-${kind}`처럼 런타임 생성 클래스는 tailwind.config.js safelist에 등록 (아니면 빌드에서 제거됨).
- 스토어 상태 필드는 `spinState`. 액션 `spin()`과 이름 겹치면 안 됨 (실제 버그 이력).
- React StrictMode 금지 (가챠 애니메이션 effect가 두 번 실행됨).
- 테스트는 `createGameStore({clock, storage, random, autoSave:false, playSounds:false})`로 스토어 주입.
- 디버그 훅: `window.__samStore`, `window.__i18nMissing`

## 사용자가 정한 해석
- +1분/−1분은 남은 시간 기준 (+1분이면 시계가 늘어남)
- 일괄 추첨 기록은 1 Gold 기준 저장, 결과 창에 1~4 Gold 반환표 함께 표시
- 시상식은 언제든 열 수 있고, 10:00 이후 버튼 강조

## 명령어
`npm install` / `npm run dev` / `npm test` / `npm run build` / `npm run preview` / `npm run build:single`

## 작업 방식
- 시작 전 README.md를 읽고 `npm test` 통과 확인
- 기능을 바꾸면 관련 테스트 추가/수정
- 레이아웃을 바꾸면 1920×1080 넘침 확인 (가능하면 스크린샷)
- 끝나면 `npm run build:single`로 교실용 HTML 재생성
- 답변은 한국어로, 짧고 실용적으로, 표 위주로
