import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = process.env.PORT || 3000;
const publicDir = join(process.cwd(), "public");
const kr = (...letters) => String.fromCodePoint(...letters);
const food = kr(0xc0ac, 0xb8cc);
const toy = kr(0xc7a5, 0xb09c, 0xac10);
const recommend = kr(0xcd94, 0xcc9c);
const products = [
  { name: kr(0xac15, 0xc544, 0xc9c0, 0x20, 0xc0ac, 0xb8cc), category: food, price: 25000 },
  { name: kr(0xace0, 0xc591, 0xc774, 0x20, 0xc0ac, 0xb8cc), category: food, price: 22000 },
  { name: kr(0xc090, 0xc090, 0xc774, 0x20, 0xc7a5, 0xb09c, 0xac10), category: toy, price: 8900 },
  { name: kr(0xace0, 0xc591, 0xc774, 0x20, 0xb099, 0xc2ef, 0xb300), category: toy, price: 12000 },
];

function replyFor(message) {
  const question = String(message || "").trim().toLowerCase();
  if (!question) return "Please enter a message.";

  const product = products.find(({ name }) => question.includes(name.toLowerCase()));
  if (product) return `${product.name}: ${product.price.toLocaleString()} KRW (${product.category})`;
  if (question.includes(recommend)) return products.slice(0, 2).map(({ name, price }) => `${name} (${price.toLocaleString()} KRW)`).join("\n");

  const category = products.find(({ category: itemCategory }) => question.includes(itemCategory));
  if (category) return products.filter(({ category: itemCategory }) => itemCategory === category.category).map(({ name, price }) => `${name} (${price.toLocaleString()} KRW)`).join("\n");

  return "Ask about a product, category, or recommendation.";
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
        response.end(JSON.stringify({ error: "Invalid request." }));
      }
    });
    return;
  }

  if (request.method !== "GET") return response.writeHead(405).end();
  const requestedPath = url.pathname === "/" ? "index.html" : url.pathname === "/ui" ? "ui.html" : url.pathname.replace(/^\/+/, "");
  const filePath = normalize(join(publicDir, requestedPath));
  if (!filePath.startsWith(publicDir)) return response.writeHead(403).end();

  try {
    const content = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found.");
  }
}).listen(port, () => console.log(`Mango Chatbot: http://localhost:${port}`));
