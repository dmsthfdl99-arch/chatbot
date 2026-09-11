const STORAGE_KEY = "mango-chat-sessions";
const MAX_SESSIONS = 3;
const list = document.querySelector("#session-list");
const messages = document.querySelector("#messages");
const title = document.querySelector("#session-title");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#message");

function loadSessions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* Start fresh if saved data is invalid. */ }
  return [createSession()];
}

function createSession() {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [{ role: "bot", text: "Ask about food, toys, or a recommendation." }],
  };
}

let sessions = loadSessions();
let activeId = sessions[0].id;

function saveSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function activeSession() {
  return sessions.find((session) => session.id === activeId);
}

function render() {
  const current = activeSession();
  title.textContent = current.title;
  list.replaceChildren();
  sessions.forEach((session) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `session-button${session.id === activeId ? " active" : ""}`;
    button.textContent = session.title;
    button.addEventListener("click", () => { activeId = session.id; render(); });
    list.append(button);
  });

  messages.replaceChildren();
  current.messages.forEach((message) => {
    const bubble = document.createElement("p");
    bubble.className = `message ${message.role}`;
    bubble.textContent = message.text;
    messages.append(bubble);
  });
  messages.scrollTop = messages.scrollHeight;
}

function addMessage(role, text) {
  const current = activeSession();
  current.messages.push({ role, text });
  if (role === "user" && current.title === "New chat") current.title = text.slice(0, 20);
  saveSessions();
  render();
}

async function sendMessage(text) {
  const message = text.trim();
  if (!message) return;
  addMessage("user", message);
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await response.json();
    addMessage("bot", data.reply || data.error || "No response received.");
  } catch {
    addMessage("bot", "The server is unavailable. Please try again.");
  }
}

document.querySelector("#new-chat").addEventListener("click", () => {
  const session = createSession();
  sessions = [session, ...sessions].slice(0, MAX_SESSIONS);
  activeId = session.id;
  saveSessions();
  render();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = input.value;
  input.value = "";
  sendMessage(message);
});

document.querySelectorAll("[data-message]").forEach((button) => {
  button.addEventListener("click", () => sendMessage(button.dataset.message));
});

render();
