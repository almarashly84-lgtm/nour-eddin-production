/**
 * Nour Eddin Production — Cloudflare Worker
 * Public:  GET /api/site · POST /api/track · GET /media/:key (with Range for video/audio) · /sitemap.xml · / (SEO rendered on the server)
 * Admin:   /api/admin/* (cookie session, password hashed with PBKDF2)
 * Static files (site + /admin) are served from ./public by Workers Assets.
 */
import SEED from "./seed.json";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY CHECK (id = 1), pass_hash TEXT NOT NULL, salt TEXT NOT NULL, iterations INTEGER NOT NULL, must_change INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_login_ip ON login_attempts (ip, ts);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, day TEXT NOT NULL, ts INTEGER NOT NULL, lang TEXT, ref TEXT);
CREATE INDEX IF NOT EXISTS idx_events_day ON events (day, type);
`;

const PBKDF2_ITER = 100000; // Workers' WebCrypto maximum
const SESSION_DAYS = 7;
const MAX_FAILS = 5; // per IP …
const FAIL_WINDOW = 15 * 60 * 1000; // … per 15 minutes
const COOKIE = "__Host-nour";
/* view = page visit · service = a service card opened · work = a portfolio item opened · whatsapp/call/email/social = contact clicks · music = music started */
const EVENT_TYPES = ["view", "service", "work", "whatsapp", "call", "email", "social", "music"];
const LANGS = ["ar", "de", "en"];
/* Upload limits. Cloudflare accepts request bodies up to 100 MB on the Free plan; files are streamed, never held in memory. */
const LIMITS = { image: 6 * 1024 * 1024, audio: 25 * 1024 * 1024, video: 95 * 1024 * 1024 };
const MEDIA_RE = /^[a-z0-9-]+\.(webp|jpg|png|mp3|m4a|mp4|webm)$/;

let schemaReady = false;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    // One address for Google: www.example.com always forwards to example.com
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    try {
      if (!schemaReady) {
        await env.DB.exec(SCHEMA.replace(/\n/g, " "));
        schemaReady = true;
      }
      const p = url.pathname;

      if (p === "/api/site" && req.method === "GET")
        return await json(publicSite(await loadSite(env)), 200, { "Cache-Control": "public, max-age=20" });
      if (p === "/api/track" && req.method === "POST") return await track(req, env);
      if (p.startsWith("/media/") && (req.method === "GET" || req.method === "HEAD")) return await media(p.slice(7), req, env);
      if (p === "/sitemap.xml") return await sitemap(url);
      if (p === "/robots.txt")
        return new Response(`User-agent: *\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${url.origin}/sitemap.xml\n`, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" }
        });
      if (p === "/" || p === "/index.html") return await homePage(req, env, url);

      if (p.startsWith("/api/admin/")) {
        const route = p.slice("/api/admin/".length);
        if (req.method !== "GET" && !sameOrigin(req, url)) return json({ error: "bad_origin" }, 403);
        if (route === "login" && req.method === "POST") return await login(req, env);

        const session = await getSession(req, env);
        if (!session) return json({ error: "unauthorized" }, 401);

        if (route === "me" && req.method === "GET") return await me(env);
        if (route === "logout" && req.method === "POST") return await logout(req, env);
        if (route === "password" && req.method === "POST") return await changePassword(req, env);
        if (route === "site" && req.method === "GET") return json(await loadSite(env), 200, { "Cache-Control": "no-store" });
        if (route === "site" && req.method === "PUT") return await saveSite(req, env, ctx);
        if (route === "upload" && req.method === "POST") return await upload(req, env, url);
        if (route === "stats" && req.method === "GET") return await stats(url, env);
        if (route === "stats" && req.method === "DELETE") return await clearStats(url, env);
        return json({ error: "not_found" }, 404);
      }
      if (p.startsWith("/api/")) return json({ error: "not_found" }, 404);
      return await env.ASSETS.fetch(req);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.code }, err.status);
      console.error((err && err.stack) || err);
      return json({ error: "server_error" }, 500);
    }
  }
};

/* ------------------------------------------------------------------ helpers */
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", ...headers }
  });
}
/* Blocks requests sent from other websites (CSRF). The session cookie is SameSite=Strict as well. */
function sameOrigin(req, url) {
  const o = req.headers.get("Origin");
  if (o) return o === url.origin;
  const site = req.headers.get("Sec-Fetch-Site");
  if (site) return site === "same-origin";
  const ref = req.headers.get("Referer");
  try {
    return !!ref && new URL(ref).origin === url.origin;
  } catch {
    return false;
  }
}
const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256(s) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}
function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return hex(a);
}
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function pbkdf2(password, saltB64, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}
async function readJson(req, max = 512 * 1024) {
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > max) throw new HttpError(413, "too_large");
  const text = await req.text();
  if (text.length > max) throw new HttpError(413, "too_large");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "bad_json");
  }
}
class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
const today = (env) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: env.SHOP_TIMEZONE || "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
/* IPs are only kept as a salted hash for the login lock, and deleted after a day. */
const ipKey = async (req, env) => sha256((req.headers.get("CF-Connecting-IP") || "local") + "|" + (env.IP_SALT || "nour"));
const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* ------------------------------------------------------------------ site data */
async function loadSite(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'site'").first();
  return row ? JSON.parse(row.value) : SEED;
}
/* Hidden services, works and tracks never leave the server. */
function publicSite(site) {
  const s = JSON.parse(JSON.stringify(site));
  s.services = s.services.filter((x) => !x.hidden);
  s.works = s.works.filter((x) => !x.hidden);
  const active = s.music.tracks.find((t) => t.id === s.music.active) || s.music.tracks[0];
  s.music = {
    enabled: s.music.enabled && !!active,
    volume: s.music.volume,
    track: active ? { title: active.title, src: active.src } : null
  };
  return s;
}

const str = (v, max = 200) =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .trim()
        .slice(0, max)
    : "";
const i18n = (v, max = 200) => {
  const o = {};
  if (typeof v === "string") {
    const s = str(v, max);
    if (s) o.ar = s;
    return o;
  }
  if (v && typeof v === "object")
    LANGS.forEach((l) => {
      const s = str(v[l], max);
      if (s) o[l] = s;
    });
  return o;
};
const hasText = (o) => !!(o && (o.ar || o.de || o.en));
const httpsUrl = (v) => {
  const s = str(v, 500);
  if (!s) return "";
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
};
const slug = (v, fallback) => {
  const s = str(v, 40)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
};
const imgPath = (v) => {
  const s = str(v, 120);
  return /^\/media\/[a-z0-9-]+\.(webp|jpg|png)$/.test(s) || /^art\/[a-z0-9-]+\.svg$/.test(s) ? s : "";
};
const audioPath = (v) => {
  const s = str(v, 120);
  return /^\/media\/[a-z0-9-]+\.(mp3|m4a)$/.test(s) || /^audio\/[a-z0-9-]+\.(mp3|m4a)$/.test(s) ? s : "";
};
const videoPath = (v) => {
  const s = str(v, 120);
  return /^\/media\/[a-z0-9-]+\.(mp4|webm)$/.test(s) ? s : "";
};
const youtubeId = (v) => {
  const s = str(v, 300);
  if (!s) return "";
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id = "";
    if (host === "youtu.be") id = u.pathname.slice(1, 12);
    else if (host === "youtube.com" || host === "youtube-nocookie.com")
      id = u.searchParams.get("v") || (u.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/) || [])[1] || "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  } catch {
    return "";
  }
};
export const ICONS = [
  "rings",
  "mic",
  "broadcast",
  "interview",
  "corporate",
  "megaphone",
  "camera",
  "edit",
  "drone",
  "live",
  "studio",
  "music",
  "web",
  "print",
  "laser",
  "target",
  "portrait",
  "star"
];
const WORK_TYPES = ["image", "video", "youtube", "link"];

export function sanitizeSite(input) {
  if (!input || typeof input !== "object") throw new HttpError(400, "bad_site");
  const used = new Set();
  const uid = (v, prefix) => {
    let id = slug(v, prefix + "-" + randomToken(3));
    while (used.has(id)) id += "-" + randomToken(2);
    used.add(id);
    return id;
  };

  const services = (Array.isArray(input.services) ? input.services : []).slice(0, 16).map((x) => {
    const o = {
      id: uid(x.id, "srv"),
      icon: ICONS.includes(x.icon) ? x.icon : "star",
      name: i18n(x.name, 60),
      short: i18n(x.short, 24),
      desc: i18n(x.desc, 700),
      points: (Array.isArray(x.points) ? x.points : [])
        .slice(0, 8)
        .map((p) => i18n(p, 120))
        .filter(hasText)
    };
    if (!hasText(o.name)) throw new HttpError(400, "service_name_required");
    if (x.hidden === true) o.hidden = true;
    return o;
  });
  const srvIds = new Set(services.map((x) => x.id));

  const works = (Array.isArray(input.works) ? input.works : []).slice(0, 150).map((x) => {
    const type = WORK_TYPES.includes(x.type) ? x.type : "image";
    const o = { id: uid(x.id, "work"), type, cat: srvIds.has(x.cat) ? x.cat : "", title: i18n(x.title, 100), img: imgPath(x.img) };
    if (type === "video") {
      o.video = videoPath(x.video);
      if (!o.video) throw new HttpError(400, "work_video_required");
    }
    if (type === "youtube") {
      o.youtube = youtubeId(x.youtube);
      if (!o.youtube) throw new HttpError(400, "work_youtube_required");
    }
    if (type === "link") {
      o.url = httpsUrl(x.url);
      if (!o.url) throw new HttpError(400, "work_link_required");
    }
    if (type === "image" && !o.img) throw new HttpError(400, "work_image_required");
    if (x.hidden === true) o.hidden = true;
    return o;
  });

  const m = input.music || {};
  const tracks = (Array.isArray(m.tracks) ? m.tracks : [])
    .slice(0, 12)
    .map((t) => ({ id: uid(t.id, "track"), title: str(t.title, 80) || "Music", src: audioPath(t.src) }))
    .filter((t) => t.src);
  const vol = Number(m.volume);
  const music = {
    enabled: m.enabled !== false,
    volume: Number.isFinite(vol) ? Math.min(1, Math.max(0.05, Math.round(vol * 100) / 100)) : 0.35,
    tracks,
    active: tracks.some((t) => t.id === m.active) ? m.active : tracks[0] ? tracks[0].id : ""
  };

  const a = input.about || {};
  const about = {
    title: i18n(a.title, 80),
    role: i18n(a.role, 80),
    text: i18n(a.text, 3000),
    photo: imgPath(a.photo),
    stats: (Array.isArray(a.stats) ? a.stats : [])
      .slice(0, 4)
      .map((s) => ({ value: str(s.value, 12), label: i18n(s.label, 40) }))
      .filter((s) => s.value && hasText(s.label)),
    links: (Array.isArray(a.links) ? a.links : [])
      .slice(0, 6)
      .map((l) => ({ label: i18n(l.label, 50), url: httpsUrl(l.url) }))
      .filter((l) => l.url && hasText(l.label))
  };

  const wa = str(input.whatsapp, 20).replace(/\D/g, "");
  if (wa && (wa.length < 8 || wa.length > 15)) throw new HttpError(400, "bad_whatsapp");
  const email = str(input.email, 120);
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(email)) throw new HttpError(400, "bad_email");
  const phones = (Array.isArray(input.phones) ? input.phones : [])
    .slice(0, 3)
    .map((p) => str(p, 30).replace(/[^\d+ ()/-]/g, ""))
    .filter((p) => p.replace(/\D/g, "").length >= 6);

  const social = {};
  ["youtube", "facebook", "instagram", "tiktok"].forEach((k) => {
    social[k] = httpsUrl(input.social && input.social[k]);
  });
  const l = input.legal || {};
  const legal = {};
  [
    "company",
    "owner",
    "legalForm",
    "address",
    "phone",
    "email",
    "uid",
    "registerNo",
    "registerCourt",
    "gisa",
    "chamber",
    "authority",
    "trade"
  ].forEach((k) => {
    legal[k] = str(l[k], 160);
  });
  const it = input.intro || {};

  return {
    name: str(input.name, 50) || "Nour Eddin Production",
    nameAr: str(input.nameAr, 50),
    tagline: i18n(input.tagline, 120),
    heroSub: i18n(input.heroSub, 240),
    seoDesc: i18n(input.seoDesc, 160),
    keywords: i18n(input.keywords, 400),
    demoNote: i18n(input.demoNote, 200),
    intro: { enabled: it.enabled !== false, text: i18n(it.text, 120) },
    music,
    services,
    about,
    works,
    phones,
    whatsapp: wa,
    email,
    city: i18n(input.city, 60),
    social,
    defaultLang: LANGS.includes(input.defaultLang) ? input.defaultLang : "de",
    messageLang: LANGS.includes(input.messageLang) ? input.messageLang : "ar",
    legal
  };
}

async function saveSite(req, env, ctx) {
  const site = sanitizeSite(await readJson(req));
  await env.DB.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES ('site', ?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?1, updated_at = ?2"
  )
    .bind(JSON.stringify(site), Date.now())
    .run();
  ctx.waitUntil(cleanupMedia(env, site));
  return json({ ok: true, site });
}

/* Delete uploaded files that are no longer used (older than 1 hour, so fresh uploads survive until saved). */
async function cleanupMedia(env, site) {
  if (!env.MEDIA) return;
  const used = new Set([site.about.photo]);
  site.works.forEach((w) => {
    used.add(w.img);
    used.add(w.video);
  });
  site.music.tracks.forEach((t) => used.add(t.src));
  const list = await env.MEDIA.list({ limit: 1000 });
  const old = Date.now() - 3600 * 1000;
  const dead = list.objects.filter((o) => !used.has("/media/" + o.key) && o.uploaded.getTime() < old).map((o) => o.key);
  if (dead.length) await env.MEDIA.delete(dead);
}

/* ------------------------------------------------------------------ home page: SEO data rendered on the server */
async function homePage(req, env, url) {
  const res = await env.ASSETS.fetch(new Request(new URL("/", url), { headers: req.headers }));
  if (!res.ok) return res;
  const site = publicSite(await loadSite(env));
  const lang = LANGS.includes(url.searchParams.get("lang")) ? url.searchParams.get("lang") : site.defaultLang;
  const T = (o) => (o && (o[lang] || o.de || o.en || o.ar)) || "";
  const brand = lang === "ar" && site.nameAr ? site.nameAr : site.name;
  const full = `${brand} – ${T(site.tagline)}`;
  const title = full.length <= 60 ? full : brand.slice(0, 60);
  const desc = (T(site.seoDesc) || `${T(site.tagline)}: ${site.services.map((s) => T(s.name)).join(", ")}`).slice(0, 158);
  const origin = url.origin;
  const ld = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: site.name,
    alternateName: site.nameAr || undefined,
    url: origin + "/",
    image: origin + "/brand/og.jpg",
    logo: origin + "/brand/logo-full.webp",
    description: desc,
    telephone: site.phones[0] || undefined,
    email: site.email || undefined,
    address: { "@type": "PostalAddress", addressLocality: "Wien", addressCountry: "AT" },
    areaServed: ["Wien", "Österreich"],
    sameAs: Object.values(site.social).filter(Boolean),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: T({ ar: "الخدمات", de: "Leistungen", en: "Services" }),
      itemListElement: site.services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: T(s.name), description: T(s.desc).slice(0, 300) }
      }))
    }
  };
  /* Crawlers see the services and the biography as plain HTML; the page script then builds the interactive version. */
  const srvHtml = site.services
    .map((s) => `<article class="srv-ssr"><h3>${escHtml(T(s.name))}</h3><p>${escHtml(T(s.desc))}</p></article>`)
    .join("");
  const aboutHtml = `<p>${escHtml(T(site.about.text)).replace(/\n+/g, "</p><p>")}</p>`;
  return new HTMLRewriter()
    .on("html", {
      element(e) {
        e.setAttribute("lang", lang === "de" ? "de-AT" : lang);
        e.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
      }
    })
    .on("title", {
      element(e) {
        e.setInnerContent(title);
      }
    })
    .on('meta[name="description"]', {
      element(e) {
        e.setAttribute("content", desc);
      }
    })
    .on('meta[name="keywords"]', {
      element(e) {
        e.setAttribute("content", T(site.keywords));
      }
    })
    .on('meta[property="og:title"]', {
      element(e) {
        e.setAttribute("content", title);
      }
    })
    .on('meta[property="og:description"]', {
      element(e) {
        e.setAttribute("content", desc);
      }
    })
    .on('meta[property="og:url"]', {
      element(e) {
        e.setAttribute("content", origin + "/");
      }
    })
    .on('meta[property="og:image"]', {
      element(e) {
        e.setAttribute("content", origin + "/brand/og.jpg");
      }
    })
    .on('meta[property="og:locale"]', {
      element(e) {
        e.setAttribute("content", { ar: "ar_AR", de: "de_AT", en: "en_GB" }[lang]);
      }
    })
    .on('link[rel="canonical"]', {
      element(e) {
        e.setAttribute("href", origin + "/" + (lang !== site.defaultLang ? "?lang=" + lang : ""));
      }
    })
    .on('script[type="application/ld+json"]', {
      element(e) {
        e.setInnerContent(JSON.stringify(ld).replace(/</g, "\\u003c"), { html: false });
      }
    })
    .on("#srvGrid", {
      element(e) {
        e.setInnerContent(srvHtml, { html: true });
      }
    })
    .on("#aboutText", {
      element(e) {
        e.setInnerContent(aboutHtml, { html: true });
      }
    })
    .on("head", {
      element(e) {
        LANGS.forEach((l) => e.append(`<link rel="alternate" hreflang="${l}" href="${escHtml(origin + "/?lang=" + l)}">`, { html: true }));
        e.append(`<link rel="alternate" hreflang="x-default" href="${escHtml(origin + "/")}">`, { html: true });
      }
    })
    .transform(new Response(res.body, { status: res.status, headers: htmlHeaders(res, lang) }));
}

function htmlHeaders(res, lang) {
  const h = new Headers(res.headers); // keeps the security headers from public/_headers
  h.set("Content-Type", "text/html; charset=utf-8");
  h.set("Cache-Control", "no-cache");
  h.set("Content-Language", lang);
  h.delete("ETag");
  h.delete("Content-Length");
  return h;
}

function sitemap(url) {
  const o = url.origin;
  const pages = ["/", "/?lang=ar", "/?lang=de", "/?lang=en", "/impressum.html", "/datenschutz.html"];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `<url><loc>${escHtml(o + p)}</loc></url>`).join("\n")}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

/* ------------------------------------------------------------------ media (images, music, video) */
function sniff(b, kind) {
  const s = (i, n) => String.fromCharCode(...b.slice(i, i + n));
  if (kind === "image") {
    if (s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return "image/webp";
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b[0] === 0x89 && s(1, 3) === "PNG") return "image/png";
  }
  if (kind === "audio") {
    if (s(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return "audio/mpeg";
    if (s(4, 4) === "ftyp" && /^(M4A |M4B |mp42|isom|dash)$/.test(s(8, 4))) return "audio/mp4";
  }
  if (kind === "video") {
    if (s(4, 4) === "ftyp" && !/^(M4A |M4B )$/.test(s(8, 4))) return "video/mp4";
    if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  }
  return null;
}
const EXT = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "video/mp4": "mp4",
  "video/webm": "webm"
};

async function upload(req, env, url) {
  if (!env.MEDIA) return json({ error: "storage_missing" }, 500);
  const kind = url.searchParams.get("kind");
  if (!LIMITS[kind]) return json({ error: "bad_type" }, 400);
  const len = Number(req.headers.get("Content-Length") || 0);
  if (!len || !req.body) return json({ error: "no_file" }, 411);
  if (len > LIMITS[kind]) return json({ error: "too_large", max: LIMITS[kind] }, 413);

  // Read just enough to recognise the file type, then stream the rest straight into storage.
  const reader = req.body.getReader();
  const head = [];
  let got = 0;
  while (got < 16) {
    const { done, value } = await reader.read();
    if (done) break;
    head.push(value);
    got += value.length;
  }
  const first = new Uint8Array(got);
  let off = 0;
  head.forEach((c) => {
    first.set(c, off);
    off += c.length;
  });
  const type = sniff(first, kind);
  if (!type) {
    reader.cancel();
    return json({ error: "bad_type" }, 415);
  }

  const key = `${Date.now().toString(36)}-${randomToken(6)}.${EXT[type]}`;
  const { readable, writable } = new FixedLengthStream(len);
  const pump = (async () => {
    const w = writable.getWriter();
    await w.write(first);
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      await w.write(value);
    }
    await w.close();
  })();
  await Promise.all([
    pump,
    env.MEDIA.put(key, readable, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" } })
  ]);
  return json({ ok: true, url: "/media/" + key, type });
}

async function media(key, req, env) {
  if (!MEDIA_RE.test(key) || !env.MEDIA) return new Response("Not found", { status: 404 });
  const ranged = req.headers.has("Range");
  let obj;
  try {
    obj = ranged ? await env.MEDIA.get(key, { range: req.headers }) : await env.MEDIA.get(key);
  } catch {
    return new Response("Range Not Satisfiable", { status: 416 });
  } // a range outside the file
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers({
    "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
    ETag: obj.httpEtag
  });
  const body = req.method === "HEAD" ? null : obj.body;
  if (ranged && obj.range) {
    const r = obj.range;
    let start, end;
    if (r.suffix != null) {
      start = Math.max(0, obj.size - r.suffix);
      end = obj.size - 1;
    } else {
      start = r.offset || 0;
      end = r.length != null ? Math.min(obj.size - 1, start + r.length - 1) : obj.size - 1;
    }
    h.set("Content-Range", `bytes ${start}-${end}/${obj.size}`);
    h.set("Content-Length", String(end - start + 1));
    return new Response(body, { status: 206, headers: h });
  }
  h.set("Content-Length", String(obj.size));
  return new Response(body, { headers: h });
}

/* ------------------------------------------------------------------ tracking (no names, numbers or IPs are stored) */
async function track(req, env) {
  let body;
  try {
    body = await readJson(req, 2048);
  } catch {
    return new Response(null, { status: 204 });
  }
  const type = EVENT_TYPES.includes(body.type) ? body.type : null;
  if (!type) return new Response(null, { status: 204 });
  const ref = typeof body.ref === "string" && /^[a-z0-9-]{1,40}$/.test(body.ref) ? body.ref : null;
  await env.DB.prepare("INSERT INTO events (type, day, ts, lang, ref) VALUES (?, ?, ?, ?, ?)")
    .bind(type, today(env), Date.now(), LANGS.includes(body.lang) ? body.lang : null, ref)
    .run();
  return new Response(null, { status: 204 });
}

/* ------------------------------------------------------------------ auth */
function getCookie(req, name) {
  const c = req.headers.get("Cookie") || "";
  const m = c.split(/;\s*/).find((p) => p.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}
function sessionCookie(token, maxAge) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
async function getSession(req, env) {
  const token = getCookie(req, COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await env.DB.prepare("SELECT token_hash, expires_at FROM sessions WHERE token_hash = ?")
    .bind(await sha256(token))
    .first();
  if (!row || row.expires_at < Date.now()) return null;
  return row;
}
async function createSession(env) {
  const token = randomToken();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
    env.DB.prepare("INSERT INTO sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)").bind(
      await sha256(token),
      now + SESSION_DAYS * 86400000,
      now
    )
  ]);
  return token;
}
async function setPassword(env, password, mustChange) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = b64(saltBytes);
  const hash = await pbkdf2(password, salt, PBKDF2_ITER);
  await env.DB.prepare(
    "INSERT INTO admin (id, pass_hash, salt, iterations, must_change, updated_at) VALUES (1, ?1, ?2, ?3, ?4, ?5) ON CONFLICT(id) DO UPDATE SET pass_hash = ?1, salt = ?2, iterations = ?3, must_change = ?4, updated_at = ?5"
  )
    .bind(hash, salt, PBKDF2_ITER, mustChange ? 1 : 0, Date.now())
    .run();
}

async function login(req, env) {
  const ip = await ipKey(req, env);
  const now = Date.now();
  const fails = await env.DB.prepare("SELECT COUNT(*) AS n, MIN(ts) AS first FROM login_attempts WHERE ip = ? AND ts > ?")
    .bind(ip, now - FAIL_WINDOW)
    .first();
  if (fails.n >= MAX_FAILS) {
    const wait = Math.ceil((fails.first + FAIL_WINDOW - now) / 60000);
    return json({ error: "locked", minutes: Math.max(1, wait) }, 429);
  }
  let body;
  try {
    body = await readJson(req, 2048);
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const password = typeof body.password === "string" ? body.password : "";

  const admin = await env.DB.prepare("SELECT * FROM admin WHERE id = 1").first();
  let ok = false;
  if (admin) {
    ok = safeEqual(await pbkdf2(password, admin.salt, admin.iterations), admin.pass_hash);
  } else if (env.ADMIN_INITIAL_PASSWORD) {
    // First login: accept the setup secret once, then store it hashed and force a change.
    ok = password.length > 0 && safeEqual(await sha256(password), await sha256(env.ADMIN_INITIAL_PASSWORD));
    if (ok) await setPassword(env, password, true);
  } else {
    return json({ error: "not_configured" }, 503);
  }

  if (!ok) {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO login_attempts (ip, ts) VALUES (?, ?)").bind(ip, now),
      env.DB.prepare("DELETE FROM login_attempts WHERE ts < ?").bind(now - 86400000)
    ]);
    return json({ error: "wrong_password", left: Math.max(0, MAX_FAILS - fails.n - 1) }, 401);
  }
  await env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
  const token = await createSession(env);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token, SESSION_DAYS * 86400) });
}

async function me(env) {
  const admin = await env.DB.prepare("SELECT must_change, updated_at FROM admin WHERE id = 1").first();
  return json({ ok: true, mustChange: !!(admin && admin.must_change), passwordUpdated: admin ? admin.updated_at : null }, 200, {
    "Cache-Control": "no-store"
  });
}

async function logout(req, env) {
  const token = getCookie(req, COOKIE);
  if (token)
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await sha256(token))
      .run();
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}

async function changePassword(req, env) {
  let body;
  try {
    body = await readJson(req, 2048);
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";
  const admin = await env.DB.prepare("SELECT * FROM admin WHERE id = 1").first();
  if (!admin || !safeEqual(await pbkdf2(current, admin.salt, admin.iterations), admin.pass_hash))
    return json({ error: "wrong_password" }, 401);
  if (next.length < 10 || next.length > 128) return json({ error: "weak_password" }, 400);
  if (next === current) return json({ error: "same_password" }, 400);
  await setPassword(env, next, false);
  await env.DB.prepare("DELETE FROM sessions").run(); // sign out every device
  const token = await createSession(env);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token, SESSION_DAYS * 86400) });
}

/* ------------------------------------------------------------------ statistics */
function yearOf(url) {
  const y = parseInt(url.searchParams.get("year"), 10);
  const now = new Date().getUTCFullYear();
  return Number.isInteger(y) && y >= 2020 && y <= now + 1 ? y : now;
}
async function stats(url, env) {
  const year = yearOf(url);
  const from = `${year}-01-01`,
    to = `${year}-12-31`;
  const [byMonth, services, socials, years] = await env.DB.batch([
    env.DB.prepare(
      "SELECT type, CAST(substr(day, 6, 2) AS INTEGER) AS m, COUNT(*) AS n FROM events WHERE day BETWEEN ? AND ? GROUP BY type, m"
    ).bind(from, to),
    env.DB.prepare(
      "SELECT ref, COUNT(*) AS n FROM events WHERE type = 'service' AND day BETWEEN ? AND ? GROUP BY ref ORDER BY n DESC"
    ).bind(from, to),
    env.DB.prepare("SELECT ref, COUNT(*) AS n FROM events WHERE type = 'social' AND day BETWEEN ? AND ? GROUP BY ref ORDER BY n DESC").bind(
      from,
      to
    ),
    env.DB.prepare("SELECT DISTINCT substr(day, 1, 4) AS y FROM events ORDER BY y DESC")
  ]);
  const months = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, ...Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])) }));
  const totals = Object.fromEntries(EVENT_TYPES.map((t) => [t, 0]));
  byMonth.results.forEach((r) => {
    const mo = months[r.m - 1];
    if (mo) {
      mo[r.type] = r.n;
      totals[r.type] += r.n;
    }
  });
  const yrs = years.results.map((r) => Number(r.y));
  if (!yrs.includes(year)) yrs.unshift(year);
  return json(
    { year, years: [...new Set(yrs)].sort((a, b) => b - a), totals, months, services: services.results, socials: socials.results },
    200,
    { "Cache-Control": "no-store" }
  );
}
async function clearStats(url, env) {
  const year = yearOf(url);
  await env.DB.prepare("DELETE FROM events WHERE day BETWEEN ? AND ?").bind(`${year}-01-01`, `${year}-12-31`).run();
  return json({ ok: true });
}
