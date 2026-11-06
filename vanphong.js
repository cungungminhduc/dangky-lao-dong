/* ============================================================
 * KHUNG VĂN PHÒNG — thanh menu phòng ban + mục 🏢 Công ty công khai (bản 3.64, vé 01)
 * ============================================================
 * Đặc tả: .scratch/van-phong/DAC-TA.md. CHỈ trangchu.html dùng — khung nằm ngay ở link trang chủ, không thêm link mới
 * (Dương chốt 05/11/2026, mục 0.17). Nạp SAU cau-hinh.js · goi-may-chu.js, TRƯỚC khối mã của trang.
 *
 *   - Màn rộng: thanh menu phòng ban trên cùng (đứng yên), chọn việc thì chỉ vùng dưới đổi.
 *   - Màn hẹp ≤ 860 px (chọn bằng CSS, vanphong.css): không có thanh menu; màn đầu là ô việc xếp theo phòng; vào việc thì
 *     trên cùng có "◀ Trang chủ". Đổi bề ngang chỉ đổi cách bày, không mất mục đang mở.
 *   - Địa chỉ đổi theo mục (trangchu.html#nha-may-dang-tuyen): gửi link được, nút ◀ của trình duyệt quay lại mục trước,
 *     tải lại vẫn đúng chỗ. Việc có `cu` mở trang riêng đang chạy, cùng thẻ.
 *
 * Màn đăng nhập (#man_dn) và ô việc sau đăng nhập (#man_chu, gói đầu, làm mới ngầm…) vẫn là mã CŨ của trangchu.html,
 * bọc trong #vp_cu — khung chỉ quyết định lúc nào cho nó hiện. Mã cũ báo mỗi lần đổi màn qua vpDoiMan_().
 * Vé 02: việc theo quyền — cột `can` của VP_MENU (trống = ai cũng thấy), xét theo chức vụ + phòng của tài khoản trong gói đầu.
 * Menu chỉ là đường đi cho gọn: trang nào cũng tự kiểm quyền ở máy chủ.
 * Vé 06 (3.64.1): bảng menu VP_MENU, quyền, vẽ thanh, menu thả chuyển sang thanh-menu.js (dùng chung với 8 trang riêng) —
 * trangchu.html nạp thanh-menu.js TRƯỚC tệp này.
 */

var VP_CHO = '<div class="vp-cho">⏳ <b>Đang lấy thông tin…</b> — có khi phải chờ vài chục giây. Đừng tải lại trang.</div>';

var vpCK = { dang: false, kq: null, loi: '' };    // cú cong_khai: một lượt cho cả Thông tin lẫn Thông báo
var vpNM = { dang: false, kq: null, loi: '' };    // danh sách nhà máy (cú danh_sach_cong_ty, bản nhớ chung trang đăng ký)
var vpDaChenZalo = false;

/** Địa chỉ → mục. Lạ, hoặc là việc mở trang riêng → trang chủ. */
function vpDocDuong_() {
  var h = String(location.hash || '').replace(/^#/, '').replace(/-/g, '_');
  var f = vpTimViec_(h);
  return h === 'dang_nhap' || h === 'tai_khoan' || (f && !f.v.cu) ? h : 'trang_chu';
}
function vpDi_(muc, thay) {
  var h = '#' + muc.replace(/_/g, '-');
  if (location.hash === h) { vpTheoDuong_(); return; }
  if (thay) location.replace(h); else location.hash = h;   // đổi địa chỉ → hashchange → vpTheoDuong_
}
function vpTheoDuong_() {
  vpMuc = vpDocDuong_();
  vpMoDm = '';
  vpVe_();
  if (window.scrollTo) window.scrollTo(0, 0);
}

/** Vẽ theo mục đang mở. Màn cũ (#vp_cu) hiện ở: #dang-nhap khi chưa có vé · trang chủ khi đã có vé. */
function vpVe_() {
  var coVe = vpCoVe_();
  if (vpMuc === 'dang_nhap' && coVe) { vpDi_('trang_chu', true); return; }
  if (vpMuc === 'tai_khoan' && !coVe) { vpDi_('dang_nhap', true); return; }
  var cu = vpMuc === 'dang_nhap' || (vpMuc === 'trang_chu' && coVe);
  vpLop_(document.body, 'vp-trong-viec', vpMuc !== 'trang_chu');
  vpLop_(vpEl_('vp_cu'), 'an', !cu);
  vpLop_(vpEl_('vp_trang'), 'an', cu);
  vpVeThanh_();
  if (cu) { vpChenNgoaiZalo_(); if (coVe) vpVeThemCu_(); } else vpVeMuc_();
}

/** Mã cũ của trang chủ vừa đổi màn: đăng nhập xong → man_chu · vé hết / đăng xuất → man_dn. Số làm mới ngầm cũng gọi vào đây
 *  (man_chu) — lúc đó đang xem mục công khai thì không kéo đi, không vẽ lại. */
function vpDoiMan_(man) {
  if (man === 'man_chu' && vpMuc === 'dang_nhap') { vpDi_('trang_chu', true); return; }
  var loi = vpEl_('dn_loi');
  var coCauBao = !!(loi && !loi.classList.contains('an'));
  // Vé hết (mã cũ hiện man_dn KÈM câu báo) → sang màn đăng nhập cho người dùng đọc được câu báo. Đăng xuất: không câu báo →
  // về trang chủ của khách (kể cả khi đăng xuất từ 👤 Tài khoản).
  if (man === 'man_dn' && !vpCoVe_() && (vpMuc === 'trang_chu' || vpMuc === 'tai_khoan')) {
    if (coCauBao) { vpDi_('dang_nhap', true); return; }
    if (vpMuc === 'tai_khoan') { vpDi_('trang_chu', true); return; }
  }
  if (vpMuc === 'trang_chu' || vpMuc === 'dang_nhap') vpVe_(); else vpVeThanh_();
}

/** Trang chủ đã đăng nhập (ô việc cũ): thêm nhóm 🏢 Công ty — điện thoại không có thanh menu, đây là đường tới mục công khai.
 *  Dùng đúng lớp của trang chủ cũ cho cùng một kiểu ô. */
function vpVeThemCu_() {
  var o = vpEl_('vp_them');
  if (!o) return;
  var d = VP_MENU[0];
  var html = '<div class="ke">' + d.bt + ' ' + vpThoat_(d.ten) + '</div><div class="ke-ghi">' + d.ghi + '</div><div class="luoi">' +
    d.viec.map(function (v) {
      return '<a class="o-viec mo-cong" href="#' + v.id.replace(/_/g, '-') + '"><span class="bt" aria-hidden="true">' + v.bt +
        '</span><b>' + vpThoat_(v.ten) + '</b><span class="mt">' + vpThoat_(v.mt) + '</span></a>';
    }).join('') + '</div>';
  if (o.innerHTML !== html) o.innerHTML = html;
}

/** Trang chặn "Mở bằng trình duyệt" chỉ ở màn đăng nhập / phần cần đăng nhập (DAC-TA mục 4) — mục công khai xem được trong Zalo. */
function vpChenNgoaiZalo_() {
  if (vpDaChenZalo) return;
  vpDaChenZalo = true;
  var s = document.createElement('script');
  s.src = 'ngoai-zalo.js';
  document.body.appendChild(s);
}

// ---------------- Vùng dữ liệu ----------------
function vpHtmlO_(v) {
  return '<a class="vp-o" href="' + (v.cu || '#' + v.id.replace(/_/g, '-')) + '"><span class="vp-bt" aria-hidden="true">' + v.bt +
    '</span><b>' + vpThoat_(v.ten) + '</b><span class="vp-mt">' + vpThoat_(v.mt) + '</span></a>';
}
function vpHtmlChuKhach_() {
  return '<h1>🏠 Trang chủ</h1><div class="vp-goi-y">👉 Chạm một ô để xem hoặc làm việc đó. Việc của người phụ trách (danh '
    + 'sách gọi, phân công, quân số…): bấm <b>🔐 Đăng nhập</b>.</div>' +
    vpMenuCuaToi_().map(function (x) {
      var d = x.d;
      return '<section class="vp-nhom"><div class="vp-nhom-ten">' + d.bt + ' ' + vpThoat_(d.ten) + '</div>' +
        '<div class="vp-nhom-ghi">' + d.ghi + '</div><div class="vp-luoi">' + x.viec.map(vpHtmlO_).join('') + '</div></section>';
    }).join('') +
    '<section class="vp-nhom"><div class="vp-nhom-ten">🔐 Cần đăng nhập</div><div class="vp-nhom-ghi">Danh sách gọi · phân '
    + 'công đón · báo quân số · dữ liệu tuyển. Dùng tên đăng nhập (hoặc số căn cước) + mật khẩu được cấp.</div>' +
    '<a class="vp-nut-chinh" href="#dang-nhap">🔐 Đăng nhập</a></section>';
}

/** 👤 Tài khoản của tôi: tên, tên đăng nhập, phòng, chức vụ + Đăng xuất (dùng đúng hộp hỏi lại + xoá vé, xoá số của mã cũ). */
function vpHtmlTaiKhoan_() {
  var tk = vpTK_().tk || {};
  var dong = [['Họ tên', tk.ten_nguoi],
              ['Tên đăng nhập', tk.ten_dang_nhap || (tk.ten_nguoi ? 'Chưa có — đăng nhập bằng số căn cước' : '')],
              ['Phòng', tk.ten_phong || (tk.phong === undefined && tk.ten_nguoi ? 'Vận hành' : '')],
              ['Chức vụ', tk.ten_chuc_vu]];
  return '<div class="vp-duong">👤 Tài khoản ›</div><h1>👤 Tài khoản của tôi</h1>' +
    '<div class="vp-goi-y">👉 Xong việc trên máy dùng chung thì bấm <b>🚪 Đăng xuất</b>. Đổi tên, phòng, chức vụ: nhờ quản trị.</div>' +
    '<dl class="vp-the vp-tt">' + dong.map(function (x) {
      return '<div class="vp-tt-dong"><dt>' + x[0] + '</dt><dd>' + vpGiaTri_(x[1]) + '</dd></div>';
    }).join('') + '</dl>' +
    '<button type="button" class="vp-nut" data-dang-xuat="1">🚪 Đăng xuất</button>';
}
function vpCauLoi_(x) {
  if (x && x.ma === 'SAI_HANH_DONG') return 'Máy chủ chưa lên bản 3.64 — quản trị cập nhật máy chủ (Apps Script) trước rồi tải lại trang.';
  return (x && (x.loi || x.message)) || 'Không nối được máy chủ. Kiểm tra mạng rồi thử lại.';
}
function vpHtmlLoi_(loi, viec) {
  return '<div class="vp-loi">⚠️ ' + vpThoat_(loi) + '</div><button type="button" class="vp-nut" data-thu-lai="' + viec + '">🔄 Thử lại</button>';
}
function vpGiaTri_(s) {
  if (!s) return '<span class="vp-ghi-mo">—</span>';
  if (/^https?:\/\/[^\s"<>]+$/i.test(s)) return '<a href="' + vpThoat_(s) + '" target="_blank" rel="noopener">' + vpThoat_(s) + '</a>';
  return vpThoat_(s);
}

function vpLayCongKhai_() {
  if (vpCK.dang) return;
  if (typeof goiMayChu_ !== 'function' || typeof TOKEN_API === 'undefined') {
    vpCK.loi = 'Trang thiếu tệp cau-hinh.js hoặc goi-may-chu.js — báo quản trị.';
    return;
  }
  vpCK.dang = true; vpCK.loi = '';
  goiMayChu_({ token: TOKEN_API, hanh_dong: 'cong_khai' }).then(function (kq) {
    if (kq && kq.ok) vpCK.kq = kq; else vpCK.loi = vpCauLoi_(kq);
  }, function (e) { vpCK.loi = vpCauLoi_(e); }).then(function () {
    vpCK.dang = false;
    vpVeLai_();
  });
}
function vpHtmlCongKhai_(ve) {
  if (!vpCK.kq && !vpCK.loi) vpLayCongKhai_();
  if (vpCK.kq) return ve(vpCK.kq);
  return vpCK.loi ? vpHtmlLoi_(vpCK.loi, 'cong_khai') : VP_CHO;
}

function vpLayNhaMay_() {
  if (vpNM.dang) return;
  if (typeof napDsCongTy_ !== 'function' || typeof TOKEN_API === 'undefined') {
    vpNM.loi = 'Trang thiếu tệp cau-hinh.js hoặc goi-may-chu.js — báo quản trị.';
    return;
  }
  vpNM.dang = true; vpNM.loi = '';
  // Bản nhớ chung với trang đăng ký / đón: có thì hiện NGAY (lucNho > 0), bản mới về sau (lucNho = 0)
  napDsCongTy_(function (kq, lucNho) {
    vpNM.kq = kq;
    if (!lucNho) vpNM.dang = false;
    vpVeLai_();
  }, function (loi) {
    vpNM.dang = false;
    vpNM.loi = vpCauLoi_(loi);
    vpVeLai_();
  });
}

var VP_TRANG = {
  thong_tin_cong_ty: function () {
    return '<div class="vp-goi-y">👉 Thông tin chung của công ty — ai cũng xem được, không cần đăng nhập.</div>' +
      vpHtmlCongKhai_(function (kq) {
        if (!kq.thong_tin.length) return '<div class="vp-the vp-ghi-mo">Chưa có thông tin nào — quản trị điền ở tab CONG_KHAI trong Sheet.</div>';
        return '<dl class="vp-the vp-tt">' + kq.thong_tin.map(function (r) {
          return '<div class="vp-tt-dong"><dt>' + (vpThoat_(r.ten) || '—') + '</dt><dd>' + vpGiaTri_(r.gia_tri) + '</dd></div>';
        }).join('') + '</dl>';
      });
  },
  thong_bao: function () {
    return '<div class="vp-goi-y">👉 Tin chung cho mọi người. Tin mới nhất ở trên.</div>' +
      vpHtmlCongKhai_(function (kq) {
        if (!kq.thong_bao.length) return '<div class="vp-the vp-ghi-mo">Chưa có thông báo nào.</div>';
        return kq.thong_bao.map(function (t) {
          var phu = [t.ngay, t.nguoi_dang].filter(function (x) { return x; }).map(vpThoat_).join(' · ');
          return '<article class="vp-the"><div class="vp-tb-tieu">📢 ' + (vpThoat_(t.tieu_de) || '(Không có tiêu đề)') + '</div>' +
            (phu ? '<div class="vp-tb-phu">' + phu + '</div>' : '') +
            (t.noi_dung ? '<div class="vp-tb-noi">' + vpThoat_(t.noi_dung) + '</div>' : '') + '</article>';
        }).join('');
      });
  },
  nha_may_dang_tuyen: function () {
    var dau = '<div class="vp-goi-y">👉 Các nhà máy đang nhận người. Muốn ghi người đi làm: bấm <b>📝 Đăng ký lao động</b> ở '
      + 'cuối danh sách.</div>';
    if (!vpNM.kq && !vpNM.loi) vpLayNhaMay_();
    if (!vpNM.kq) return dau + (vpNM.loi ? vpHtmlLoi_(vpNM.loi, 'nha_may') : VP_CHO);
    var ds = vpNM.kq.danh_sach || [];
    var nhom = [['thoi_vu', '🟦 Thời vụ'], ['chinh_thuc', '🟩 Chính thức'], ['', 'Khác']];
    var than = nhom.map(function (n) {
      var cua = ds.filter(function (c) { return n[0] ? c.loai === n[0] : c.loai !== 'thoi_vu' && c.loai !== 'chinh_thuc'; });
      if (!cua.length) return '';
      return '<section class="vp-the"><div class="vp-nhom-ten">' + n[1] + ' · ' + cua.length + ' nhà máy</div><ul class="vp-nm-ds">' +
        cua.map(function (c) { return '<li>🏭 ' + vpThoat_(c.ten_cong_ty) + '</li>'; }).join('') + '</ul></section>';
    }).join('') || '<div class="vp-the vp-ghi-mo">Hiện chưa có nhà máy nào đang tuyển.</div>';
    var ghi = vpNM.loi ? '<div class="vp-loi">⚠️ Chưa lấy được bản mới: ' + vpThoat_(vpNM.loi) + ' Đang hiện danh sách lưu trong '
        + 'máy.</div><button type="button" class="vp-nut" data-thu-lai="nha_may">🔄 Thử lại</button>'
      : (vpNM.dang ? '<div class="vp-ghi-mo">⏳ Đang lấy bản mới…</div>' : '');
    return dau + ghi + than + '<a class="vp-nut-chinh" href="index.html">📝 Đăng ký lao động</a>';
  }
};

function vpVeMuc_() {
  var f = vpTimViec_(vpMuc);
  vpEl_('vp_trang').innerHTML = vpMuc === 'tai_khoan' ? vpHtmlTaiKhoan_() : !f ? vpHtmlChuKhach_()
    : '<div class="vp-duong">' + f.dm.bt + ' ' + vpThoat_(f.dm.ten) + ' ›</div><h1>' + f.v.bt + ' ' + vpThoat_(f.v.ten) + '</h1>' +
      VP_TRANG[vpMuc]();
}
/** Số vừa về: đang xem một mục trong khung thì vẽ lại mục đó (trang chủ không cần số). */
function vpVeLai_() { if (vpTimViec_(vpMuc) && !vpEl_('vp_trang').classList.contains('an')) vpVeMuc_(); }

// ---------------- Bấm (menu thả ở thanh-menu.js) ----------------
vpEl_('vp_trang').addEventListener('click', function (e) {
  // 👤 Tài khoản → Đăng xuất: bấm đúng nút Đăng xuất của mã cũ (hộp hỏi lại, xoá vé + số đã lưu); xong thì vpDoiMan_ đưa về trang chủ
  if (e.target && e.target.closest && e.target.closest('[data-dang-xuat]')) { vpEl_('nut_thoat').click(); return; }
  var b = e.target && e.target.closest ? e.target.closest('[data-thu-lai]') : null;
  if (!b) return;
  if (b.getAttribute('data-thu-lai') === 'nha_may') { vpNM.loi = ''; vpLayNhaMay_(); }
  else { vpCK.loi = ''; vpLayCongKhai_(); }
  vpVeMuc_();
});
window.addEventListener('hashchange', vpTheoDuong_);

// Vẽ lần đầu khi cả trang (kể cả khối mã cũ) đã chạy xong. Mã cũ đổi màn trước đó thì vpDoiMan_ đã vẽ phần của nó.
vpMuc = vpDocDuong_();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vpVe_); else vpVe_();
