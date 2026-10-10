import { put, list, get } from "@vercel/blob";
import crypto from "node:crypto";
import { temRedis, redis, pipe } from "./_redis.js";

// Preços oficiais (o servidor sempre recalcula o valor; não confia no navegador)
export const PACOTES = { 100: 29.0, 500: 59.0, 1000: 89.0, 5000: 249.0 };
export const STATUS = ["aguardando", "pago", "em_entrega", "concluido", "cancelado"];

const caminho = (id) => `pedidos/${id}.json`;

// Pedidos ficam no Redis quando ele está conectado; senão, no Blob.
export async function salvar(pedido) {
  if (temRedis()) {
    await pipe([
      ["SET", `pedido:${pedido.id}`, JSON.stringify(pedido)],
      ["ZADD", "pedidos", Date.parse(pedido.criadoEm), pedido.id],
    ]);
    return;
  }
  await put(caminho(pedido.id), JSON.stringify(pedido), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function ler(id) {
  if (temRedis()) {
    const s = await redis("GET", `pedido:${id}`);
    return s ? JSON.parse(s) : null;
  }
  const r = await get(caminho(id), { access: "private", useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}

export async function listarTodos() {
  if (temRedis()) {
    const ids = await redis("ZREVRANGE", "pedidos", 0, 999);
    if (!ids || !ids.length) return [];
    const vals = await redis("MGET", ...ids.map((i) => `pedido:${i}`));
    return vals.filter(Boolean).map((s) => JSON.parse(s));
  }
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
