# 돈나무 누르기 - Standalone 버전

순수 HTML, CSS, JavaScript로만 동작하는 오프라인 게임입니다.

## 실행 방법

1. `src/main/resources/static/images/` 폴더의 모든 이미지 파일을 `standalone/images/` 폴더로 복사
2. `index.html` 파일을 웹 브라우저로 열기
3. 인터넷 연결 없이도 완전히 동작합니다

## 필요한 이미지 파일

다음 이미지 파일들을 `standalone/images/` 폴더에 복사해야 합니다:
- `image.png` (기본 나무 이미지)
- `pop.png` (기본 클릭 효과)
- `christmas.png` (크리스마스 나무)
- `rich.png` (부자 나무)
- `coin.png` (코인 클릭 효과)

## 파일 구조

```
standalone/
├── index.html      # 메인 HTML 파일
├── css/
│   └── style.css   # 스타일시트
├── js/
│   └── script.js   # 게임 로직
└── images/         # 게임 이미지 (수동 복사 필요)
    ├── image.png
    ├── pop.png
    ├── christmas.png
    ├── rich.png
    └── coin.png
```

## 주요 기능

- ✅ 완전 오프라인 동작 (서버 불필요)
- ✅ localStorage를 통한 게임 데이터 저장
- ✅ 오프라인 수익 자동 계산 (게임을 닫았다가 다시 열어도 수익 누적)
- ✅ 모든 기능이 Spring Boot 없이 동작

## 차이점 (Spring Boot 버전과 비교)

- 서버 통신 제거: 모든 데이터가 localStorage에 저장됨
- 오프라인 수익 계산: 클라이언트에서 `lastSaveTime`을 기반으로 계산
- 이미지 경로: 상대 경로 사용 (`images/` 대신 `/images/`)
- userId 관리: URL 업데이트 없이 localStorage만 사용

