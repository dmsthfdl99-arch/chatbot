from fastapi import FastAPI                         # 01
from fastapi.middleware.cors import CORSMiddleware  # 02
from pydantic import BaseModel                      # 03
import requests, os, re                              # 04
from dotenv import load_dotenv                      # 05

load_dotenv()                                       # 06
app = FastAPI()                                     # 07

app.add_middleware(                                 # 08
    CORSMiddleware,                                 # 09
    allow_origins=["*"],                            # 10
    allow_methods=["*"],                            # 11
    allow_headers=["*"],                            # 12
)                                                   # 13

class Msg(BaseModel):                               # 14
    text: str                                       # 15

HF_URL = "https://router.huggingface.co/v1/chat/completions" # 16
HF_MODEL = "Qwen/Qwen2.5-72B-Instruct"             # 17
CHAT_HISTORY = []


def sanitize_reply(text: str) -> str:
    text = text.replace("\r", "").replace("\n", " ")
    text = text.replace("*", "").replace("/", "")
    text = re.sub(r"[^\uAC00-\uD7A3\s.,!?~()\-😊😄😆😚💖🤗✨💕🥰]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return "질문을 다시 말씀해 주세요. 🙏"

    if not text.endswith(("!", "?", ".", "😊", "😄", "😆", "😚", "💖", "🤗", "✨", "💕", "🥰")):
        text += " 😊"
    return text


def build_messages(q: str):
    system_prompt = (
        "당신은 '하루'라는 이름의 귀엽고 다정한 한국어 챗봇입니다. "
        "당신 자신을 절대로 '사람'이라고 말하지 말고, 항상 '저는 챗봇 하루입니다' 또는 '저는 챗봇이에요'처럼 자신을 챗봇이라고 소개하세요. "
        "이전 대화 내용을 기억하고 자연스럽게 연결해서 답하세요. "
        "절대로 사용자 말투를 따라하지 마세요. 이미 대화한 내용이 있으면 그 맥락을 유지하되, "
        "항상 존댓말과 부드러운 애교 톤으로 답하세요. "
        "말의 시작과 끝에 자연스럽게 이모티콘을 붙이세요. 예: '안녕하세요~ 😊', '도와드릴게요! 🤗', '그럼 바로 해결해볼까요? 💖'. "
        "짧고 친절하게 2~4문장으로 답하고, markdown, 별표(*), 슬래시(/) 같은 장식 문자는 사용하지 마세요. "
        "한글만 정확하게 사용하고 깨진 문자나 이상한 기호는 금지입니다."
    )
    messages = [{"role": "system", "content": system_prompt}]

    for item in CHAT_HISTORY[-6:]:
        messages.append({"role": item["role"], "content": item["text"]})

    messages.append({"role": "user", "content": q})
    return messages


def ask_ai(q: str) -> str:                          # 18
    token = os.getenv("HF_TOKEN")                   # 19
    headers = {"Authorization": f"Bearer {token}"}  # 20
    payload = {                                     # 21
        "model": HF_MODEL,                          # 22
        "messages": build_messages(q),
        "max_tokens": 260,
        "temperature": 0.5,
    }
    res = requests.post(HF_URL, headers=headers, json=payload) # 26
    data = res.json()                               # 27
    reply = data["choices"][0]["message"]["content"] # 28
    cleaned = sanitize_reply(reply)
    CHAT_HISTORY.append({"role": "user", "text": q})
    CHAT_HISTORY.append({"role": "assistant", "text": cleaned})
    return cleaned                                  # 29

@app.post("/chat")                                  # 27
def chat(msg: Msg):                                 # 28
    reply = ask_ai(msg.text)                        # 29
    return {"reply": reply}                         # 30