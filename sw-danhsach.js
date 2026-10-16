/* ============================================================
 * LƯU SẴN TRANG DANH SÁCH TRONG MÁY (service worker, bản 3.32)
 * ============================================================
 * Dương báo 16/10/2026: lúc cao điểm trong khu công nghiệp sóng nghẽn, mở trang là trắng / đơ. Tệp này
 * giữ một bản của trang danh sách + vài tệp nó cần ngay trong máy:
 *   - Mở trang: đưa NGAY bản trong máy, đồng thời lấy bản mới trên mạng về cất cho lần sau.
 *   - Chưa có bản trong máy (lần đầu): lấy từ mạng như bình thường.
 *
 * GIỚI HẠN CỐ Ý — đừng nới:
 *   - CHỈ đụng đúng các tệp trong TEP. Mọi trang khác (đăng ký, đón, phân công, quân số…) đi thẳng ra mạng
 *     như chưa có tệp này — không ai bị dính bản cũ của trang mình không biết.
 *   - KHÔNG BAO GIỜ đụng lời gọi máy chủ (script.google.com, POST): khác nguồn, nên tự đi qua.
 *   - Không lưu dữ liệu lao động nào: chỉ lưu MÃ trang. Danh sách người vẫn do trang tự nhớ như trước.
 *
 * HỆ QUẢ PHẢI BIẾT KHI TRIỂN KHAI: tải bản mới lên GitHub xong, người đã cài sẽ thấy bản mới từ LẦN MỞ THỨ
 * HAI (lần đầu vẫn là bản trong máy, bản mới được cất ngầm). Đổi BAN dưới đây khi muốn xoá sạch bản cũ.
 */
var BAN = 'ds-3.32.0';
var TEP = ['danhsach.html', 'cau-hinh.js', 'goi-may-chu.js', 'ngoai-zalo.js', 'app-danhsach.webmanifest',
           'icon-ds-192.png', 'icon-ds-512.png'];

function tenTep(url) { return url.pathname.split('/').pop(); }

self.addEventListener('install', function (e) {
  // Từng tệp một: thiếu một tệp trên GitHub (quên tải lên) thì các tệp kia vẫn được cất.
  e.waitUntil(caches.open(BAN).then(function (c) {
    return Promise.all(TEP.map(function (t) { return c.add(t).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ds) {
    return Promise.all(ds.filter(function (k) { return k.indexOf('ds-') === 0 && k !== BAN; })
                         .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  var ten = tenTep(url);
  if (TEP.indexOf(ten) < 0) return;            // không phải tệp của mình → để trình duyệt tự lo
  // cau-hinh.js · goi-may-chu.js · ngoai-zalo.js là tệp DÙNG CHUNG với trang khác: chỉ đưa bản trong máy
  // khi chính trang danh sách xin. Trang đăng ký / đón… xin thì đi thẳng ra mạng như chưa có tệp này.
  var rieng = ten === 'danhsach.html' || ten === 'app-danhsach.webmanifest' || ten.indexOf('icon-ds-') === 0;
  if (!rieng && !/\/danhsach\.html(\?|#|$)/.test(req.referrer || '')) return;

  // Khoá cất = đường dẫn KHÔNG kèm ?…, để danhsach.html?x=1 vẫn dùng chung một bản.
  var khoa = url.origin + url.pathname;
  e.respondWith(caches.open(BAN).then(function (c) {
    return c.match(khoa).then(function (cu) {
      var moi = fetch(req).then(function (r) {
        if (r && r.ok) c.put(khoa, r.clone());
        return r;
      });
      if (cu) {
        e.waitUntil(moi.catch(function () {}));
        return cu;
      }
      return moi;
    });
  }));
});
