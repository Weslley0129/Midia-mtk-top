import { put, list, get } from "@vercel/blob";
import crypto from "node:crypto";

// Preços oficiais (o servidor sempre recalcula o valor; não confia no navegador)
export const PACOTES = { 100: 29.0, 500: 59.0, 1000: 89.0, 5000: 249.0 };
export const STATUS = ["aguardando", "pago", "em_entrega", "concluido", "cancelado"];

const caminho = (id) => `pedidos/${id}.json`;

export async function salvar(pedido) {
  await put(caminho(pedido.id), JSON.stringify(pedido), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function ler(id) {
  const r = await get(caminho(id), { access: "private", useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}

export async function listarTodos() {
  const blobs = [];
  let cursor;
  do {
    const res = await list({ prefix: "pedidos/", cursor, limit: 1000 });
    blobs.push(...res.blobs);
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  const pedidos = await Promise.all(
    blobs.map(async (b) => {
      try {
        const r = await get(b.pathname, { access: "private", useCache: false });
        if (!r || r.statusCode !== 200) return null;
        return JSON.parse(await new Response(r.stream).text());
      } catch {
        return null;
      }
    })
  );
  return pedidos.filter(Boolean).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
}

export function autorizado(req) {
  const senha = process.env.ADMIN_PASSWORD || "";
  const enviada = String(req.headers["x-admin-senha"] || "");
  if (!senha || enviada.length !== senha.length) return false;
  return crypto.timingSafeEqual(Buffer.from(enviada), Buffer.from(senha));
}

export function novoId() {
  const t = Date.now().toString(36).toUpperCase().slice(-5);
  const r = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `PED${t}${r}`;
}

export const limpar = (v, n) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
