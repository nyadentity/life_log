// ライフログ Service Worker（毎回更新チェック方式）
const APP_VERSION = "4.8";
const CACHE = "lifelog-v" + APP_VERSION;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

// インストール：プリキャッシュして即待機解除（すぐ新版を有効化）
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 有効化：古いキャッシュを削除して即制御開始
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ページからのメッセージで即有効化（フォールバック）
self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

// フェッチ：
// HTML と sw 関連（ナビゲーション/ドキュメント）は network-first（毎回最新を取得）。
// その他（アイコン等）と CDN は cache-first（通信節約）。
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isHTML = req.mode === "navigate" || req.destination === "document";

  if (isHTML) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res.ok && (url.origin === location.origin || url.hostname.includes("cloudflare"))) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
