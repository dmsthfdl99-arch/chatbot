# AI 챗봇

FastAPI 백엔드와 React 프론트엔드로 구성한 한국어 AI 챗봇입니다. 사용자의 대화 내용을 일부 기억하며, 친근한 한국어 답변을 제공합니다.

## 배포 서비스

- 프론트엔드: https://two026-chatbot-frontend-pqxx.onrender.com
- 백엔드 API: https://two026-chatbot-backend-73r8.onrender.com
- 채팅 API: `POST https://two026-chatbot-backend-73r8.onrender.com/chat`

배포된 프론트엔드 주소에 접속하면 바로 챗봇을 사용할 수 있습니다.

## 기술 스택

- Frontend: React, Vite
- Backend: Python, FastAPI
- AI API: Hugging Face Inference API
- Deployment: Render

## 프로젝트 구조

```text
chatbot/
├── backend/
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── src/
    ├── package.json
    └── vite.config.js
```

## 로컬 실행

### 백엔드

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

백엔드는 `http://localhost:8000`에서 실행됩니다.

Hugging Face API를 사용하려면 `backend/.env`에 토큰을 설정해야 합니다.

```env
HF_TOKEN=your_huggingface_token
```

### 프론트엔드

```powershell
cd frontend
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.

## 프론트엔드 빌드

```powershell
cd frontend
npm run build
```

## 사용 방법

1. 입력창에 질문을 작성합니다.
2. `전송` 버튼을 누르거나 Enter 키를 입력합니다.
3. AI 챗봇의 답변을 확인합니다.

## 주의사항

- Hugging Face 토큰과 같은 비밀 정보는 Git에 커밋하지 않습니다.
- 백엔드가 먼저 실행 중이어야 프론트엔드에서 채팅 요청을 처리할 수 있습니다.
