import threading
import time
import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import db

load_dotenv()
db.init_db()

# Render 슬립타임 방어 설정 (백엔드 자체 실행)
RENDER_EXTERNAL_URL = (
    os.getenv("RENDER_EXTERNAL_URL")
    or os.getenv("KEEP_ALIVE_URL")
    or "https://chatbot00-back.onrender.com"
)
PING_INTERVAL = int(os.getenv("PING_INTERVAL", "600"))  # 기본 10분 (600초)

def keep_alive_worker():
    """Render 무료 인스턴스의 15분 절전(Spin-down)을 방지하는 백그라운드 핑 데몬 스레드"""
    time.sleep(5)
    health_url = f"{RENDER_EXTERNAL_URL.rstrip('/')}/health"
    print(f"[Keep-Alive] 슬립 방어 스레드 시작: {health_url} (주기: {PING_INTERVAL}초)", flush=True)

    while True:
        try:
            res = requests.get(health_url, timeout=30)
            print(f"[Keep-Alive] 핑 전송 성공 ({res.status_code}): {health_url}", flush=True)
        except Exception as e:
            print(f"[Keep-Alive] 핑 전송 실패 (다음 주기 재시도): {e}", flush=True)
        time.sleep(PING_INTERVAL)

threading.Thread(target=keep_alive_worker, daemon=True).start()

app = FastAPI(title="PogeunBot API", description="귀엽고 다정한 AI 챗봇 백엔드 서비스")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Msg(BaseModel):
    text: str

class Title(BaseModel):
    title: str

HF_URL = "https://router.huggingface.co/v1/chat/completions"
HF_MODEL = "Qwen/Qwen3-4B-Instruct-2507"

# 다정하고 친절한 AI 페르소나 시스템 프롬프트
SYSTEM_PROMPT = {
    "role": "system",
    "content": (
        "너는 사용자 곁에서 따뜻하고 친절하게 도움을 주는 AI 친구 '포근봇'이야! "
        "언제나 상냥하고 다정하게 존댓말로 답변해주고, 상황에 어울리는 귀여운 이모지(🐾, ✨, 🌸, 🌿 등)를 "
        "자연스럽게 사용해줘. 사용자의 질문에 똑똑하고 알기 쉽게 핵심을 짚어 대답해줘."
    )
}

def ask_ai(messages_or_text) -> str:
    """Hugging Face Inference API를 통해 AI 답변을 생성합니다."""
    token = os.getenv("HF_TOKEN")
    if not token:
        return "안녕하세요! 제 설정을 완료하려면 백엔드 `.env` 파일에 `HF_TOKEN`을 등록해주세요! ✨"

    if isinstance(messages_or_text, str):
        messages = [SYSTEM_PROMPT, {"role": "user", "content": messages_or_text}]
    else:
        # 시스템 프롬프트가 없으면 맨 앞에 추가
        if not messages_or_text or messages_or_text[0].get("role") != "system":
            messages = [SYSTEM_PROMPT] + list(messages_or_text)
        else:
            messages = messages_or_text

    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "model": HF_MODEL,
        "messages": messages,
        "max_tokens": 400,
        "temperature": 0.7,
    }
    
    try:
        res = requests.post(HF_URL, headers=headers, json=payload, timeout=60)
        if not res.ok:
            raise RuntimeError(f"HF API 오류: {res.status_code} {res.text}")
        data = res.json()
        if "choices" not in data or not data["choices"]:
            raise RuntimeError(f"HF API 응답 형식 오류: {data}")
        return data["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"AI 서버 통신 중 오류가 발생했습니다: {e}")

def build_history(session_id: int):
    """DB에 저장된 대화 기록을 프롬프트 메시지 규격으로 변환합니다."""
    rows = db.read_messages(session_id)
    history = [SYSTEM_PROMPT]
    for r in rows:
        role = "user" if r["role"] == "user" else "assistant"
        history.append({"role": role, "content": r["text"]})
    return history

@app.get("/")
@app.get("/health")
@app.get("/ping")
def health_check():
    """서버 헬스체크 및 슬립 방지용 엔드포인트"""
    return {"status": "ok", "message": "pong", "service": "PogeunBot"}

@app.post("/chat")
def chat(msg: Msg):
    """단발성 대화 엔드포인트"""
    reply = ask_ai(msg.text)
    return {"reply": reply}

@app.get("/sessions")
def list_sessions():
    """모든 대화 세션 목록 조회"""
    return db.read_sessions()

@app.post("/sessions")
def new_session():
    """새로운 대화 세션 생성"""
    session_id = db.create_session("새로운 대화 ✨")
    return {"id": session_id, "title": "새로운 대화 ✨"}

@app.get("/sessions/{session_id}/messages")
def read_messages(session_id: int):
    """특정 세션의 대화 내역 조회"""
    messages = db.read_messages(session_id)
    return {"messages": messages}

@app.post("/sessions/{session_id}/messages")
def send_message(session_id: int, msg: Msg):
    """메시지 전송 및 AI 응답 생성"""
    first = db.count_messages(session_id) == 0
    db.create_message(session_id, "user", msg.text)

    # 첫 메시지일 경우 대화방 제목을 첫 질문 내용(최대 20자)으로 자동 요약
    if first:
        clean_title = msg.text.strip().replace("\n", " ")[:20]
        if clean_title:
            db.update_session(session_id, clean_title)

    try:
        reply = ask_ai(build_history(session_id))
    except Exception as e:
        reply = f"미안해요, 응답을 가져오는 도중 작은 문제가 생겼어요 🥲 (오류: {str(e)})"

    db.create_message(session_id, "bot", reply)
    return {"reply": reply}

@app.put("/sessions/{session_id}")
def rename_session(session_id: int, body: Title):
    """세션 제목 변경"""
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="제목을 입력해주세요")
    if db.update_session(session_id, title) == 0:
        raise HTTPException(status_code=404, detail="해당 대화방을 찾을 수 없습니다")
    return {"id": session_id, "title": title}

@app.delete("/sessions/{session_id}")
def remove_session(session_id: int):
    """세션 삭제"""
    if db.delete_session(session_id) == 0:
        raise HTTPException(status_code=404, detail="해당 대화방을 찾을 수 없습니다")
    return {"deleted": session_id}