import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = process.env.PORT || 3000;
const publicDir = join(process.cwd(), "public");
const products = [
  { name: "강아지 사료", category: "사료", price: 25000 },
  { name: "고양이 사료", category: "사료", price: 22000 },
  { name: "삑삑이 장난감", category: "장난감", price: 8900 },
  { name: "고양이 낚싯대", category: "장난감", price: 12000 },
];

function replyFor(message) {
  const question = String(message || "").trim().toLowerCase();
  if (!question) return "메시지를 입력해 주세요.";

  const product = products.find(({ name }) => question.includes(name.toLowerCase()));
  if (product) return `${product.name}의 가격은 ${product.price.toLocaleString()}원입니다. (${product.category})`;

  if (question.includes("추천")) {
    return `추천 상품은 ${products.slice(0, 2).map(({ name }) => name).join(", ")}입니다.`;
  }

  const category = products.find(({ category: itemCategory }) => question.includes(itemCategory));
  if (category) {
    const items = products.filter(({ category: itemCategory }) => itemCategory === category.category);
    return `${category.category} 상품: ${items.map(({ name, price }) => `${name} (${price.toLocaleString()}원)`).join(", ")}`;
  }

  return "상품명, ‘사료’, ‘장난감’, 또는 ‘추천 상품’을 물어보세요.";
}

const mimeTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "POST" && url.pathname === "/api/chat") {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      try {
        const { message } = JSON.parse(body);
        response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ reply: replyFor(message) }));
      } catch {
        response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "올바른 요청 형식이 아닙니다." }));
      }
    });
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405).end();
    return;
  }

  const requestedPath = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  const filePath = normalize(join(publicDir, requestedPath));
  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403).end();
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("페이지를 찾을 수 없습니다.");
  }
}).listen(port, () => console.log(`Mango Chatbot: http://localhost:${port}`));
