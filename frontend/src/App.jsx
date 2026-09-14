import { useState, useEffect, useRef } from "react";

// 로컬 환경과 프로덕션 환경에 맞춘 유연한 API 기본 주소 설정
const PROD_API = "https://chatbot00-back.onrender.com";
const LOCAL_API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const API = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? LOCAL_API
  : PROD_API;

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 메시지 업데이트 또는 로딩 시 자동으로 맨 아래로 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  // 대화 세션 목록 불러오기
  const loadSessions = async () => {
    try {
      const res = await fetch(`${API}/sessions`);
      if (!res.ok) throw new Error("세션 로드 실패");
      const data = await res.json();
      const sessionList = Array.isArray(data) ? data : data.sessions ?? [];
      setSessions(sessionList);
      return sessionList;
    } catch (err) {
      console.warn("API 접속 오류:", err);
      return [];
    }
  };

  // 특정 세션의 대화 내역 불러오기
  const loadMessages = async (id) => {
    if (!id) {
      setMsgs([]);
      return;
    }
    try {
      const res = await fetch(`${API}/sessions/${id}/messages`);
      if (!res.ok) throw new Error("메시지 조회 실패");
      const data = await res.json();
      setMsgs(Array.isArray(data) ? data : data.messages ?? []);
    } catch (err) {
      console.warn("대화 불러오기 실패:", err);
      setMsgs([]);
    }
  };

  // 세션 선택
  const handleSelectSession = (id) => {
    setSessionId(id);
    loadMessages(id);
    setEditId(null);
  };

  // 새로운 대화방 생성
  const handleNewSession = async () => {
    try {
      const res = await fetch(`${API}/sessions`, { method: "POST" });
      const data = await res.json();
      await loadSessions();
      setSessionId(data.id);
      setMsgs([]);
      inputRef.current?.focus();
    } catch (err) {
      console.error("새 대화 생성 실패:", err);
    }
  };

  // 초기 로드: 세션 목록을 가져와서 첫 번째 세션 선택
  useEffect(() => {
    loadSessions().then((list) => {
      if (list && list.length > 0) {
        setSessionId(list[0].id);
        loadMessages(list[0].id);
      } else {
        handleNewSession();
      }
    });
  }, []);

  // 세션 이름 변경 시작
  const startRename = (e, s) => {
    e.stopPropagation();
    setEditId(s.id);
    setEditTitle(s.title);
  };

  // 세션 이름 저장
  const handleSaveTitle = async (id) => {
    if (!editTitle.trim()) {
      setEditId(null);
      return;
    }
    try {
      await fetch(`${API}/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setEditId(null);
      await loadSessions();
    } catch (err) {
      console.error("이름 변경 오류:", err);
    }
  };

  // 세션 삭제
  const handleRemoveSession = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("이 대화를 삭제할까요? 🐾")) return;

    try {
      const res = await fetch(`${API}/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) return;

      const list = await loadSessions();
      if (sessionId === id) {
        const nextId = list.length > 0 ? list[0].id : null;
        setSessionId(nextId);
        if (nextId) loadMessages(nextId);
        else setMsgs([]);
      }
    } catch (err) {
      console.error("세션 삭제 오류:", err);
    }
  };

  // 메시지 전송
  const handleSend = async (customText = null) => {
    const textToSend = typeof customText === "string" ? customText : input;
    if (!textToSend.trim() || loading) return;

    let targetSessionId = sessionId;
    // 세션이 없으면 새로 생성 후 전송
    if (!targetSessionId) {
      const res = await fetch(`${API}/sessions`, { method: "POST" });
      const data = await res.json();
      targetSessionId = data.id;
      setSessionId(targetSessionId);
      await loadSessions();
    }

    const trimmed = textToSend.trim();
    setInput("");
    setLoading(true);

    // 사용자 메시지 즉시 낙관적(Optimistic) 렌더링
    const tempUserMsg = { id: Date.now(), role: "user", text: trimmed };
    setMsgs((prev) => [...prev, tempUserMsg]);

    try {
      await fetch(`${API}/sessions/${targetSessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      await loadMessages(targetSessionId);
      await loadSessions();
    } catch (err) {
      console.error("메시지 전송 오류:", err);
      setMsgs((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "bot", text: "잠시 연결에 문제가 생겼어요 🥲 다시 시도해 주세요!" },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // 한글 입력 중복 전송 방지(IME isComposing) 및 엔터키 전송 처리
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSend();
    }
  };

  // 추천 질문 목록
  const suggestions = [
    "오늘 하루 기분 좋아지는 따뜻한 한마디 해줘! 🌸",
    "귀엽고 힐링되는 동물 이야기 들려줄 수 있어? 🐾",
    "일상에서 실천하기 쉬운 소소한 행복 팁 알려줘 ✨",
  ];

  const currentSession = sessions.find((s) => s.id === sessionId);

  return (
    <div className="app">
      {/* 좌측 사이드바 */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🐾</div>
          <div className="brand-info">
            <h1>포근봇</h1>
            <p>따뜻한 AI 대화 친구</p>
          </div>
        </div>

        <button className="btn-new-chat" onClick={handleNewSession}>
          <span>✨</span> 새 대화 시작하기
        </button>

        <div className="session-list-label">대화 목록</div>
        <div className="session-list-container">
          <ul className="session-list">
            {sessions.map((s) => {
              const isActive = s.id === sessionId;
              return (
                <li
                  key={s.id}
                  className={`session-item ${isActive ? "active" : ""}`}
                  onClick={() => handleSelectSession(s.id)}
                >
                  {editId === s.id ? (
                    <div className="rename-box" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveTitle(s.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                      />
                      <button className="rename-save" onClick={() => handleSaveTitle(s.id)}>
                        저장
                      </button>
                      <button className="rename-cancel" onClick={() => setEditId(null)}>
                        취소
                      </button>
                    </div>
                  ) : (
                    <>
                      <button className="session-main-btn">
                        <span className="session-emoji">💬</span>
                        <span className="session-name" title={s.title}>
                          {s.title || "새 대화"}
                        </span>
                      </button>
                      <div className="session-actions">
                        <button
                          className="session-tool-btn"
                          title="제목 수정"
                          onClick={(e) => startRename(e, s)}
                        >
                          ✏️
                        </button>
                        <button
                          className="session-tool-btn"
                          title="삭제"
                          onClick={(e) => handleRemoveSession(e, s.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* 우측 메인 채팅 영역 */}
      <main className="chat-container">
        {/* 상단 헤더 */}
        <header className="chat-header">
          <div className="chat-header-title">
            <h2>{currentSession?.title || "새로운 대화"}</h2>
            <span className="chat-badge">온라인 ✨</span>
          </div>
        </header>

        {/* 메시지 리스트 */}
        <div className="message-list">
          {msgs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧸</div>
              <h3>포근봇과 대화를 나눠보세요!</h3>
              <p>궁금한 점이나 나누고 싶은 이야기를 편하게 들려주세요. 언제나 따뜻하게 대답해 드릴게요!</p>
              <div className="suggestion-list">
                {suggestions.map((text, idx) => (
                  <button
                    key={idx}
                    className="suggestion-item"
                    onClick={() => handleSend(text)}
                  >
                    💬 {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            msgs.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`message-row ${isUser ? "user" : "bot"}`}>
                  <div className={`avatar ${isUser ? "user" : "bot"}`}>
                    {isUser ? "👤" : "🐾"}
                  </div>
                  <div className="message-bubble-wrap">
                    <div className="message-bubble">{m.text}</div>
                  </div>
                </div>
              );
            })
          )}

          {/* AI 생각 중 타이핑 인디케이터 */}
          {loading && (
            <div className="message-row bot">
              <div className="avatar bot">🐾</div>
              <div className="typing-bubble">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 하단 입력 영역 */}
        <div className="input-area">
          <div className="input-box-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="포근봇에게 메시지를 보내보세요... (Shift+Enter 줄바꿈)"
            />
            <button
              className="send-button"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              title="전송"
            >
              🐾
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

