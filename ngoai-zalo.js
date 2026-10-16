/* ============================================================
 * MỞ NGOÀI ZALO — dùng chung cho các trang có đăng nhập (bản 3.32)
 * ============================================================
 * Dương báo 16/10/2026: mở link trong Zalo thì "rất hay bị" đợi đăng nhập lâu, đơ, văng lỗi; mở bằng
 * Chrome thì ít hơn. Trình duyệt bên trong Zalo giữ đăng nhập RIÊNG (tách khỏi Chrome) và có thể xoá nó,
 * nên người dùng hay phải đăng nhập lại — tức thêm một lượt chờ dài trên sóng nghẽn.
 *
 * Tệp này chỉ làm MỘT việc: thấy đang mở trong Zalo thì hiện dải nhắc ở đầu trang.
 *   - Android: nút "Mở bằng Chrome" (intent://… — Zalo chặn thì về lại đúng trang này) + "Chép link".
 *   - iPhone:  hướng dẫn "bấm ⋯ → Mở bằng trình duyệt" + "Chép link".
 * Không đụng vào mã của trang. Thiếu tệp này thì trang vẫn chạy y như cũ, chỉ không có dải nhắc.
 * Bấm "Ẩn" thì thôi nhắc tới khi đóng tab.
 */
(function () {
  var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  if (!/Zalo/i.test(ua)) return;
  try { if (sessionStorage.getItem('an_nhac_zalo') === '1') return; } catch (e) {}

  var android = /Android/i.test(ua);
  var link = location.href.split('#')[0];
  var intent = 'intent://' + location.host + location.pathname + location.search +
    '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(link) + ';end';

  var nut = 'display:inline-block;margin:6px 6px 0 0;padding:8px 12px;border-radius:8px;font-size:14px;' +
            'font-weight:bold;text-decoration:none;border:0;cursor:pointer;';
  var d = document.createElement('div');
  d.id = 'nhac_zalo';
  d.setAttribute('style', 'background:#fff8e6;border-bottom:1px solid #f0dda0;color:#1f2933;padding:10px 14px;' +
                          'font-size:14px;line-height:1.45');
  d.innerHTML = '<b>Bạn đang mở trong Zalo</b> — ở đây trang dễ chậm và hay bắt đăng nhập lại. ' +
    (android ? 'Mở bằng Chrome cho nhanh và nhớ đăng nhập:'
             : 'Bấm <b>⋯</b> ở góc trên bên phải → <b>Mở bằng trình duyệt</b>.') + '<br>' +
    (android ? '<a id="nz_chrome" style="' + nut + 'background:#1d5fbf;color:#fff" href="' + intent + '">Mở bằng Chrome</a>' : '') +
    '<button type="button" id="nz_chep" style="' + nut + 'background:#eef1f4;color:#1f2933">Chép link</button>' +
    '<button type="button" id="nz_an" style="' + nut + 'background:transparent;color:#7b8794">Ẩn</button>';

  function gan() {
    document.body.insertBefore(d, document.body.firstChild);
    document.getElementById('nz_chep').addEventListener('click', function () {
      var b = this;
      function xong() { b.textContent = 'Đã chép — dán vào Chrome'; }
      // Trình duyệt trong Zalo có thể không cho chép tự động → hiện link cho người dùng tự chép.
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(xong, function () { prompt('Chép link này rồi dán vào Chrome:', link); });
      } else {
        prompt('Chép link này rồi dán vào Chrome:', link);
      }
    });
    document.getElementById('nz_an').addEventListener('click', function () {
      try { sessionStorage.setItem('an_nhac_zalo', '1'); } catch (e) {}
      d.parentNode.removeChild(d);
    });
  }
  if (document.body) gan(); else document.addEventListener('DOMContentLoaded', gan);
})();
