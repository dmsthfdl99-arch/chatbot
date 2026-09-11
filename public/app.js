const form = document.querySelector("#chat-form");
const input = document.querySelector("#message");
const messages = document.querySelector("#messages");

function appendMessage(text, role) {
  const element = document.createElement("p");
  element.className = `message ${role}`;
  element.textContent = text;
  messages.append(element);
  messages.scrollTop = messages.scrollHeight;
}

async function sendMessage(message) {
  appendMessage(message, "user");
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await response.json();
  appendMessage(data.reply || data.error || "응답을 가져오지 못했어요.", "bot");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  input.value = "";
  try { await sendMessage(message); } catch { appendMessage("서버에 연결할 수 없어요.", "bot"); }
});

document.querySelectorAll("[data-message]").forEach((button) => {
  button.addEventListener("click", () => sendMessage(button.dataset.message));
});
