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
var vpTKQ = { dang: false, kq: null, loi: '' };   // 3.65 cú tk_ds (⚙ Tài khoản & quyền) — CHỈ giữ trong trang, không cất vào máy
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
  var fCan = vpTimViec_(vpMuc);   // 3.65: mục trong khung cần đăng nhập (⚙ Tài khoản & quyền) mà chưa có vé → màn đăng nhập
  if (fCan && fCan.v.can && !coVe) { vpDi_('dang_nhap', true); return; }
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
  // 3.65: đăng xuất / vé hết → bỏ danh sách tài khoản đang giữ trong trang (máy dùng chung: người sau không được thấy)
  if (man === 'man_dn' && !vpCoVe_()) vpTKQ = { dang: false, kq: null, loi: '' };
  var fCan = vpTimViec_(vpMuc);
  if (man === 'man_dn' && !vpCoVe_() && fCan && fCan.v.can) { vpDi_('dang_nhap', true); return; }
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
  // 3.65: + nhóm ⚙ Quản trị cho quản trị (điện thoại không có thanh menu — đây là đường tới mục trong khung)
  var html = vpMenuCuaToi_().filter(function (x) { return x.d.id === 'cong_ty' || x.d.id === 'quan_tri'; }).map(function (x) {
    var d = x.d;
    return '<div class="ke">' + d.bt + ' ' + vpThoat_(d.ten) + '</div><div class="ke-ghi">' + d.ghi + '</div><div class="luoi">' +
      x.viec.map(function (v) {
        return '<a class="o-viec mo-cong" href="#' + v.id.replace(/_/g, '-') + '"><span class="bt" aria-hidden="true">' + v.bt +
          '</span><b>' + vpThoat_(v.ten) + '</b><span class="mt">' + vpThoat_(v.mt) + '</span></a>';
      }).join('') + '</div>';
  }).join('');
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

/** 👤 Tài khoản của tôi: tên, tên đăng nhập, phòng, chức vụ + Đăng xuất (dùng đúng hộp hỏi lại + xoá vé, xoá số của mã cũ)
 *  + 🔑 Đổi mật khẩu (3.65, vé 03). */
function vpHtmlTaiKhoan_() {
  var tk = vpTK_().tk || {};
  var dong = [['Họ tên', tk.ten_nguoi],
              ['Tên đăng nhập', tk.ten_dang_nhap || (tk.ten_nguoi ? 'Chưa có — đăng nhập bằng số căn cước' : '')],
              ['Phòng', tk.ten_phong || (tk.phong === undefined && tk.ten_nguoi ? 'Vận hành' : '')],
              ['Chức vụ', tk.ten_chuc_vu]];
  return '<div class="vp-duong">👤 Tài khoản ›</div><h1>👤 Tài khoản của tôi</h1>' +
    '<div class="vp-goi-y">👉 Xong việc trên máy dùng chung thì bấm <b>🚪 Đăng xuất</b>. Đổi mật khẩu: bấm <b>🔑 Đổi mật khẩu</b> '
    + 'bên dưới. Đổi tên, phòng, chức vụ: nhờ quản trị.</div>' +
    '<dl class="vp-the vp-tt">' + dong.map(function (x) {
      return '<div class="vp-tt-dong"><dt>' + x[0] + '</dt><dd>' + vpGiaTri_(x[1]) + '</dd></div>';
    }).join('') + '</dl>' +
    '<button type="button" class="vp-nut" data-dang-xuat="1">🚪 Đăng xuất</button>' + vpHtmlDoiMk_();
}

// ---------------- 🔑 Đổi mật khẩu (3.65, vé 03) ----------------
// Khung thu gọn, bấm mới mở. Lưu xong máy này nhận VÉ MỚI (vé cũ chết theo mật khẩu cũ) — thay vào phien_ds_v3 để trang chủ và các
// trang riêng dùng tiếp, khỏi đăng nhập lại; gói đầu chuyển sang vé mới (cùng một người).
var VP_O_MK = [['vp_mk_cu', 'Mật khẩu đang dùng', '', 'current-password'],
               ['vp_mk_moi', 'Mật khẩu mới', 'Ít nhất 6 ký tự', 'new-password'],
               ['vp_mk_lai', 'Gõ lại mật khẩu mới', 'Gõ y hệt ô trên', 'new-password']];
var vpDangMk = false;   // đang có một cú doi_mat_khau trên đường — bấm Lưu thêm không gửi lần hai

function vpHtmlDoiMk_() {
  return '<section class="vp-the vp-dmk"><div class="vp-nhom-ten">🔑 Đổi mật khẩu</div>' +
    '<div class="vp-nhom-ghi">Đổi xong: máy khác đang đăng nhập tài khoản này phải đăng nhập lại bằng mật khẩu mới. Máy này vẫn ở '
    + 'trong.</div><div class="vp-xong an" id="vp_dmk_xong" role="status"></div>' +
    '<button type="button" class="vp-nut" id="vp_dmk_mo" data-dmk="mo">🔑 Đổi mật khẩu</button>' +
    '<div class="an" id="vp_dmk_khung">' + VP_O_MK.map(function (o) {
      return '<label class="vp-nhan" for="' + o[0] + '">' + o[1] + '</label><input class="vp-o-go" id="' + o[0] +
        '" type="password" autocomplete="' + o[3] + '"' + (o[2] ? ' placeholder="' + o[2] + '"' : '') + '>' +
        '<div class="vp-loi-o an" id="' + o[0] + '_loi"></div>';
    }).join('') +
    '<button type="button" class="vp-nut" id="vp_dmk_hien" data-dmk="hien" aria-pressed="false">👁 Hiện mật khẩu</button>' +
    '<div class="vp-loi an" id="vp_dmk_loi" role="alert"></div>' +
    '<div class="vp-hang-nut"><button type="button" class="vp-nut-chinh" id="vp_dmk_luu" data-dmk="luu">💾 Lưu mật khẩu mới</button>' +
    '<button type="button" class="vp-nut" data-dmk="thoi">Thôi</button></div></div></section>';
}
/** Câu đỏ ngay dưới ô (trống = tắt). */
function vpBaoMk_(id, cau) {
  var o = vpEl_(id + '_loi'), h = vpEl_(id);
  if (o) { o.textContent = cau || ''; vpLop_(o, 'an', !cau); }
  if (h) vpLop_(h, 'sai', !!cau);
}
function vpBaoChungMk_(cau) {
  var o = vpEl_('vp_dmk_loi');
  if (o) { o.textContent = cau ? '⚠️ ' + cau : ''; vpLop_(o, 'an', !cau); }
}
function vpHienMk_(bat) {
  VP_O_MK.forEach(function (o) { var h = vpEl_(o[0]); if (h) h.type = bat ? 'text' : 'password'; });
  var n = vpEl_('vp_dmk_hien');
  if (n) { n.textContent = bat ? '🙈 Ẩn mật khẩu' : '👁 Hiện mật khẩu'; n.setAttribute('aria-pressed', bat ? 'true' : 'false'); }
}
/** Mở / thu khung. Thu (Thôi, hoặc lưu xong) thì xoá chữ đã gõ và ẩn mật khẩu — máy hay dùng chung. */
function vpMoMk_(mo) {
  vpLop_(vpEl_('vp_dmk_khung'), 'an', !mo);
  vpLop_(vpEl_('vp_dmk_mo'), 'an', mo);
  if (mo) vpLop_(vpEl_('vp_dmk_xong'), 'an', true);
  else VP_O_MK.forEach(function (o) { var h = vpEl_(o[0]); if (h) h.value = ''; vpBaoMk_(o[0], ''); });
  vpBaoChungMk_('');
  vpHienMk_(false);
}
function vpLuuMk_() {
  var gia = function (id) { var h = vpEl_(id); return (h && h.value) || ''; };
  var cu = gia('vp_mk_cu'), moi = gia('vp_mk_moi'), lai = gia('vp_mk_lai');
  // Soát HẾT một lượt, báo ngay dưới ô sai, nói cách sửa (cùng luật máy chủ — máy chủ vẫn soát lại)
  var loi = {};
  if (!cu) loi.vp_mk_cu = 'Chưa gõ mật khẩu đang dùng (mật khẩu bạn vừa đăng nhập)';
  if (!moi) loi.vp_mk_moi = 'Chưa gõ mật khẩu mới';
  else if (moi.length < 6) loi.vp_mk_moi = 'Mật khẩu mới đang có ' + moi.length + ' ký tự, cần ít nhất 6';
  else if (moi !== moi.trim()) loi.vp_mk_moi = 'Bỏ dấu cách ở đầu hoặc cuối mật khẩu mới';
  else if (moi === cu) loi.vp_mk_moi = 'Mật khẩu mới phải khác mật khẩu đang dùng';
  if (!loi.vp_mk_moi && moi && lai !== moi) loi.vp_mk_lai = lai ? 'Hai lần gõ mật khẩu mới chưa giống nhau — gõ lại ô này' : 'Gõ lại mật khẩu mới vào ô này';
  VP_O_MK.forEach(function (o) { vpBaoMk_(o[0], loi[o[0]] || ''); });
  vpBaoChungMk_('');
  if (loi.vp_mk_cu || loi.vp_mk_moi || loi.vp_mk_lai) return;
  if (typeof goiMayChu_ !== 'function' || typeof TOKEN_API === 'undefined') {
    vpBaoChungMk_('Trang thiếu tệp cau-hinh.js hoặc goi-may-chu.js — báo quản trị. Chưa đổi gì.');
    return;
  }
  var ve = '';
  try { ve = localStorage.getItem(VP_KHOA_VE) || ''; } catch (e) {}
  vpDangMk = true;
  var nut = vpEl_('vp_dmk_luu');
  if (nut) { nut.disabled = true; nut.textContent = '⏳ Đang lưu… có khi phải chờ vài chục giây'; }
  goiMayChu_({ token: TOKEN_API, hanh_dong: 'doi_mat_khau', phien: ve, mk_cu: cu, mk_moi: moi }).then(function (kq) {
    var ma = kq && kq.ma;
    if (kq && kq.ok && kq.phien) vpXongMk_(ve, kq.phien);
    else if (ma === 'HET_PHIEN') vpHetPhienMk_();
    else if (ma === 'SAI_MK_CU') vpBaoMk_('vp_mk_cu', kq.loi);
    else if (ma === 'MK_NGAN' || ma === 'MK_TRUNG' || ma === 'MK_DAU_CACH') vpBaoMk_('vp_mk_moi', kq.loi);
    else if (ma === 'SAI_HANH_DONG') vpBaoChungMk_('Máy chủ chưa lên bản 3.65 — chưa đổi gì. Quản trị cập nhật máy chủ (Apps Script) trước.');
    else vpBaoChungMk_(vpCauLoi_(kq));
  }, function () {
    // Cú ghi không tự gửi lại: hỏng giữa đường thì không biết máy chủ đã ghi chưa — nói thẳng, chỉ cách thoát cả hai ca.
    vpBaoChungMk_('Không nối được máy chủ — chưa chắc mật khẩu đã đổi. Kiểm tra mạng rồi bấm "Lưu mật khẩu mới" lần nữa. Nếu trang '
      + 'báo hết phiên: đăng nhập bằng mật khẩu MỚI, không được thì dùng mật khẩu cũ.');
  }).then(function () {
    vpDangMk = false;
    var n = vpEl_('vp_dmk_luu');
    if (n) { n.disabled = false; n.textContent = '💾 Lưu mật khẩu mới'; }
  });
}
function vpXongMk_(veCu, veMoi) {
  try { localStorage.setItem(VP_KHOA_VE, veMoi); } catch (e) {}
  if (typeof doiVeGoi_ === 'function') doiVeGoi_(veCu, veMoi);
  vpMoMk_(false);
  var x = vpEl_('vp_dmk_xong');
  if (x) {
    x.textContent = '✅ Đã đổi mật khẩu. Lần sau đăng nhập dùng mật khẩu mới. Máy khác đang đăng nhập tài khoản này sẽ phải đăng nhập lại.';
    vpLop_(x, 'an', false);
  }
}
/** Vé đã chết trước khi đổi (đổi ở máy khác, quản trị khoá) — hoặc cú gửi lại sau khi ĐÃ đổi. Không biết ca nào → nói cả hai. */
function vpHetPhienMk_() {
  var cau = 'Phiên đăng nhập đã hết — chưa chắc mật khẩu đã đổi. Đăng nhập lại: thử mật khẩu MỚI trước, không được thì dùng mật khẩu cũ.';
  if (typeof xoaHetBanNho_ === 'function') xoaHetBanNho_();
  try { localStorage.removeItem(VP_KHOA_VE); } catch (e) {}
  if (typeof veManDangNhap === 'function') veManDangNhap(cau); else vpDi_('dang_nhap', true);
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

/** 3.65 — ⚙ Tài khoản & quyền. Có trang chủ cũ thì đi qua goiAPI (kèm vé; vé hết → xoá vé + số, về màn đăng nhập). */
function vpLayTKQ_() {
  if (vpTKQ.dang) return;
  if (typeof goiMayChu_ !== 'function' || typeof TOKEN_API === 'undefined') {
    vpTKQ.loi = 'Trang thiếu tệp cau-hinh.js hoặc goi-may-chu.js — báo quản trị.';
    return;
  }
  vpTKQ.dang = true; vpTKQ.loi = '';
  var ve = '';
  try { ve = localStorage.getItem(VP_KHOA_VE) || ''; } catch (e) {}
  var goi = typeof goiAPI === 'function' ? goiAPI({ token: TOKEN_API, hanh_dong: 'tk_ds' })
    : goiMayChu_({ token: TOKEN_API, hanh_dong: 'tk_ds', phien: ve });
  goi.then(function (kq) {
    if (kq && kq.ok) vpTKQ.kq = kq;
    else if (kq && kq.ma === 'SAI_HANH_DONG') vpTKQ.loi = 'Máy chủ chưa lên bản 3.65 — quản trị cập nhật máy chủ (Apps Script) trước rồi tải lại trang.';
    else if (!(kq && kq.ma === 'HET_PHIEN')) vpTKQ.loi = vpCauLoi_(kq);
  }, function (e) { vpTKQ.loi = vpCauLoi_(e); }).then(function () {
    vpTKQ.dang = false;
    vpVeLai_();
  });
}
function vpDem_(ds, k) {
  var ra = [];
  ds.forEach(function (r) { if (r[k] && ra.indexOf(r[k]) < 0) ra.push(r[k]); });
  return ra;
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
    return '<div class="vp-goi-y">👉 Thông tin chung của công ty — ai cũng xem được, không cần đăng nhập. Cần đưa vào Excel: bấm '
      + '<b>📋 Chép dán Excel</b> hoặc <b>⬇ Tải file Excel</b>.</div>' +
      vpHtmlCongKhai_(function (kq) {
        // 3.65 vé 04: khuôn bảng chung (bang-chung.js). Thiếu tệp đó thì bày như 3.64.
        if (typeof moBang_ === 'function') {
          vpSauVe = function () {
            moBang_(vpEl_('vp_bang'), { id: 'thong_tin_cong_ty', tep: 'thong-tin-cong-ty', dong: kq.thong_tin, tim: ['ten', 'gia_tri'],
              the_tieu_de: 'ten', rong: 'Chưa có thông tin nào — quản trị điền ở tab CONG_KHAI trong Sheet.',
              cot: [{ k: 'ten', ten: 'Mục' }, { k: 'gia_tri', ten: 'Thông tin', ve: function (r) { return vpGiaTri_(r.gia_tri); } }] });
          };
          return '<div class="vp-bang" id="vp_bang"></div>';
        }
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
  },
  // 3.65 vé 05 — CHỈ XEM, chỉ quản trị (máy chủ cũng chặn). Sửa vẫn ở Sheet.
  tai_khoan_quyen: function () {
    var dau = '<div class="vp-goi-y">👉 Trang này để <b>xem</b>. Sửa ở Sheet, tab <b>NGUOI_DON</b>, rồi bấm menu <b>⚙ CẬP NHẬT &amp; KIỂM '
      + 'TRA</b> — xong quay lại đây bấm <b>🔄 Lấy lại</b>.</div>';
    var q = vpTK_();
    if (q.tk && !q.tk.la_quan_tri) return dau + '<div class="vp-loi">⚠️ Mục này chỉ quản trị xem được.</div>';
    if (typeof moBang_ !== 'function') return dau + '<div class="vp-loi">⚠️ Trang thiếu tệp bang-chung.js — tải lại trang (máy tính: Ctrl + F5).</div>';
    if (!vpTKQ.kq && !vpTKQ.loi) vpLayTKQ_();
    if (!vpTKQ.kq) return dau + (vpTKQ.loi ? vpHtmlLoi_(vpTKQ.loi, 'tk_ds') : VP_CHO);
    var kq = vpTKQ.kq;
    vpSauVe = function () {
      moBang_(vpEl_('vp_bang'), { id: 'tai_khoan_quyen', tep: 'tai-khoan-quyen', dong: kq.ds, the_tieu_de: 'ten_nguoi', the_nhan: 'tinh_trang',
        rong: 'Tab NGUOI_DON chưa có ai.', tim: ['ten_nguoi', 'ten_dang_nhap', 'so_cccd', 'nhom', 'ten_tuyen'],
        loc: [{ k: 'phong', ten: 'Phòng', ds: vpDem_(kq.ds, 'ten_phong'), khop: function (r, v) { return r.ten_phong === v; } },
              { k: 'tinh_trang', ten: 'Tình trạng', ds: vpDem_(kq.ds, 'tinh_trang'), khop: function (r, v) { return r.tinh_trang === v; } }],
        tong: function (ds) {
          var tot = ds.filter(function (r) { return r.dung_duoc; }).length;
          return 'Tổng: <b>' + ds.length + '</b> tài khoản · ✅ <b>' + tot + '</b> dùng được' +
            (ds.length - tot ? ' · ⚠️ <b>' + (ds.length - tot) + '</b> cần xử lý' : '');
        },
        cot: [{ k: 'ten_nguoi', ten: 'Tên' }, { k: 'ten_dang_nhap', ten: 'Tên đăng nhập' }, { k: 'so_cccd', ten: 'Số căn cước' },
              { k: 'ten_phong', ten: 'Phòng' }, { k: 'ten_chuc_vu', ten: 'Chức vụ' }, { k: 'nhom', ten: 'Nhóm' },
              { k: 'ten_tuyen', ten: 'Tên tuyển', md: false }, { k: 'lan_dang_nhap', ten: 'Đăng nhập gần nhất' },
              { k: 'co_mat_khau', ten: 'Có mật khẩu', chu: function (r) { return r.co_mat_khau ? 'Có' : 'Chưa'; } },
              { k: 'khoa', ten: 'Khoá', chu: function (r) { return r.khoa ? 'Bị khoá' : ''; } },
              { k: 'tinh_trang', ten: 'Tình trạng', ve: function (r) {
                return '<span class="' + (r.dung_duoc ? 'vp-tot' : 'vp-xau') + '">' + (r.dung_duoc ? '✅ ' : '⚠️ ') + vpThoat_(r.tinh_trang) + '</span>';
              } },
              { k: 'nhac', ten: 'Cần sửa / nhắc', md: false }, { k: 'so_dong', ten: 'Số dòng ở Sheet', so: true, md: false }] });
    };
    var hong = kq.loi_dong || [];
    return dau + (hong.length ? '<div class="vp-cho">⚠️ <b>' + hong.length + ' dòng hỏng</b> ở tab NGUOI_DON — không thành tài khoản:<br>' +
        hong.map(vpThoat_).join('<br>') + '</div>' : '') +
      '<button type="button" class="vp-nut" data-thu-lai="tk_ds"' + (vpTKQ.dang ? ' disabled' : '') + '>' +
      (vpTKQ.dang ? '⏳ Đang lấy bản mới…' : '🔄 Lấy lại') + '</button>' +
      (vpTKQ.loi ? '<div class="vp-loi">⚠️ Chưa lấy được bản mới: ' + vpThoat_(vpTKQ.loi) + ' Đang hiện bản lấy lúc trước.</div>' : '') +
      '<div class="vp-bang" id="vp_bang"></div>';
  }
};

var vpSauVe = null;   // 3.65: việc phải làm SAU khi vùng dữ liệu đã có HTML (khuôn bảng gắn vào #vp_bang)
function vpVeMuc_() {
  var f = vpTimViec_(vpMuc);
  vpSauVe = null;
  vpEl_('vp_trang').innerHTML = vpMuc === 'tai_khoan' ? vpHtmlTaiKhoan_() : !f ? vpHtmlChuKhach_()
    : '<div class="vp-duong">' + f.dm.bt + ' ' + vpThoat_(f.dm.ten) + ' ›</div><h1>' + f.v.bt + ' ' + vpThoat_(f.v.ten) + '</h1>' +
      VP_TRANG[vpMuc]();
  if (vpSauVe) { var sau = vpSauVe; vpSauVe = null; sau(); }
}
/** Số vừa về: đang xem một mục trong khung thì vẽ lại mục đó (trang chủ không cần số). */
function vpVeLai_() { if (vpTimViec_(vpMuc) && !vpEl_('vp_trang').classList.contains('an')) vpVeMuc_(); }

// ---------------- Bấm (menu thả ở thanh-menu.js) ----------------
vpEl_('vp_trang').addEventListener('click', function (e) {
  // 👤 Tài khoản → Đăng xuất: bấm đúng nút Đăng xuất của mã cũ (hộp hỏi lại, xoá vé + số đã lưu); xong thì vpDoiMan_ đưa về trang chủ
  if (e.target && e.target.closest && e.target.closest('[data-dang-xuat]')) { vpEl_('nut_thoat').click(); return; }
  // 3.65 — 🔑 Đổi mật khẩu
  var m = e.target && e.target.closest ? e.target.closest('[data-dmk]') : null;
  if (m) {
    var viec = m.getAttribute('data-dmk');
    if (viec === 'mo') vpMoMk_(true);
    else if (viec === 'thoi') vpMoMk_(false);
    else if (viec === 'hien') { var h = vpEl_('vp_mk_cu'); vpHienMk_(!!h && h.type === 'password'); }
    else if (viec === 'luu' && !vpDangMk) vpLuuMk_();
    return;
  }
  var b = e.target && e.target.closest ? e.target.closest('[data-thu-lai]') : null;
  if (!b) return;
  if (b.getAttribute('data-thu-lai') === 'nha_may') { vpNM.loi = ''; vpLayNhaMay_(); }
  else if (b.getAttribute('data-thu-lai') === 'tk_ds') { vpTKQ.loi = ''; vpLayTKQ_(); }
  else { vpCK.loi = ''; vpLayCongKhai_(); }
  vpVeMuc_();
});
// 3.65 — ô mật khẩu: gõ lại thì câu đỏ của ô đó tắt; Enter = Lưu
vpEl_('vp_trang').addEventListener('input', function (e) {
  var id = e.target && e.target.id;
  if (VP_O_MK.some(function (o) { return o[0] === id; })) vpBaoMk_(id, '');
});
vpEl_('vp_trang').addEventListener('keydown', function (e) {
  var id = e.target && e.target.id;
  if (e.key === 'Enter' && !vpDangMk && VP_O_MK.some(function (o) { return o[0] === id; })) vpLuuMk_();
});
window.addEventListener('hashchange', vpTheoDuong_);

// Vẽ lần đầu khi cả trang (kể cả khối mã cũ) đã chạy xong. Mã cũ đổi màn trước đó thì vpDoiMan_ đã vẽ phần của nó.
vpMuc = vpDocDuong_();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vpVe_); else vpVe_();
