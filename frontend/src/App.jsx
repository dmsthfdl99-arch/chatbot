import { useState } from "react";
import "./App.css";

const API = "http://localhost:8000/chat";

export default function App() {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = { role: "user", text: trimmed };
    setMsgs((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        throw new Error(`서버 응답 오류: ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.reply ?? "답을 받을 수 없어요.";
      const botMsg = { role: "bot", text: reply };
      setMsgs((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMsgs((prev) => [
        ...prev,
        {
          role: "bot",
          text: "서버와 연결할 수 없어요. 잠시 후 다시 시도해주세요.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter") send();
  };

  return (
    <div className="wrap">
      <h1>🤖 AI 챗봇</h1>
      <div className="box">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "bubble user" : "bubble bot"}
          >
            <span className="avatar">{m.role === "user" ? "🧑" : "🤖"}</span>
            <p>{m.text}</p>
          </div>
        ))}
        {loading && <p className="loading">생각 중...</p>}
      </div>
      <div className="input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="메시지를 입력하세요"
        />
        <button onClick={send}>전송</button>
      </div>
    </div>
  );
}
