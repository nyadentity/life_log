// ライフログ Service Worker
// 更新時はこの APP_VERSION を上げる（キャッシュが総入れ替えされる）
const APP_VERSION = "1.0";
const CACHE = "lifelog-v" + APP_VERSION;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

// インストール：新バージョンの資産をプリキャッシュ（skipWaitingしない＝待機）
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

// 有効化：古いバージョンのキャッシュを削除
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ページから SKIP_WAITING を受けたら即有効化（ユーザーが更新バーをタップした時）
self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

// フェッチ：cache-first（データ通信を最小化）
// キャッシュにあればネットに一切行かない。無いものだけネットから取得してキャッシュ。
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached; // キャッシュ命中 → 通信ゼロ
      return fetch(req).then(res => {
        // 自ドメイン or CDN のみキャッシュに追加
        if (res.ok && (url.origin === location.origin || url.hostname.includes("cloudflare"))) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => {
        // オフライン時のHTMLフォールバック
        if (req.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
