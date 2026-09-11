# Mango Chatbot

독립 실행형 상품 안내 챗봇입니다.

## 실행

```bash
npm start
```

브라우저에서 `http://localhost:3333`을 엽니다.

## 구성

- `public/`: 챗봇 화면(프론트엔드)
- `server.js`: 채팅 요청을 처리하는 Node.js API 서버
- `POST /api/chat`: `{ "message": "추천 상품" }` 요청에 챗봇 응답 반환
