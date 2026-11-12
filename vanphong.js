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
  var cu = vpMuc;
  vpMuc = vpDocDuong_();
  // 3.68 — rời mục thì đóng hộp đang mở + khung có mật khẩu vừa đặt (mật khẩu chỉ hiện MỘT lần, không nằm lại chờ người sau)
  if (cu !== vpMuc) {
    vpNG.hop = null; vpNG.xong = null; vpNG.bao = '';
    vpQLNM.hop = null; vpQLNM.xong = null;
  }
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
  if (man === 'man_dn' && !vpCoVe_()) {
    vpTKQ = { dang: false, kq: null, loi: '' };
    vpQLNM = { dang: false, kq: null, loi: '', hop: null, xong: null, gui: false, mang: 'thoi_vu', maTay: false };   // 3.68
    vpNG = { hop: null, xong: null, gui: false, loai: 'nv', bao: '' };   // 3.68 — mật khẩu vừa đặt không được nằm lại cho người sau
  }
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
  // 3.66: + nhóm 🔔 Thông báo (hộp thông báo là trang riêng → mở thẳng trang đó, kèm con số nếu hộp trả lời)
  // 3.68: + việc trong khung của nhóm Vận hành (👥 Đội của tôi / 🤝 Cộng tác viên của tôi) — các ô Vận hành khác trang chủ cũ đã có sẵn
  var html = vpMenuCuaToi_().map(function (x) {
    if (x.d.id !== 'van_hanh') return x;
    var trong = x.viec.filter(function (v) { return !v.cu; });
    return trong.length ? { d: { id: 'nguoi_cua_toi', bt: '👥', ten: 'Người của tôi', ghi: 'Thêm người, đặt lại mật khẩu khi ai đó quên, khoá người đã nghỉ.' },
                            viec: trong } : x;
  }).filter(function (x) { return x.d.id === 'cong_ty' || x.d.id === 'nguoi_cua_toi' || x.d.id === 'quan_tri' || x.d.id === 'hop_tb'; }).map(function (x) {
    var d = x.d;
    return '<div class="ke">' + d.bt + ' ' + vpThoat_(d.ten) + '</div><div class="ke-ghi">' + d.ghi + '</div><div class="luoi">' +
      x.viec.map(function (v) {
        var so = v.id === 'hop_thong_bao' ? vpChuDemTB_() : '';
        return '<a class="o-viec mo-cong" href="' + (v.cu || '#' + v.id.replace(/_/g, '-')) + '"><span class="bt" aria-hidden="true">' + v.bt +
          '</span><b>' + vpThoat_(v.ten) + '</b><span class="mt">' + vpThoat_(v.mt) + '</span>' +
          (so ? '<span class="tt">' + vpThoat_(so) + '</span>' : '') + '</a>';
      }).join('') + '</div>';
  }).join('');
  if (o.innerHTML !== html) o.innerHTML = html;
  if (html.indexOf('href="trungtam.html"') >= 0) vpLayDemTB_(vpVeThemCu_);   // chỉ hỏi khi người này CÓ ô đó; có số mới thì vẽ lại đúng khối này; đã có số / chưa nối hộp thì không làm gì
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

// ---------------- 3.68 — khai báo từ trang: cú ghi + chép ----------------
/** Cú gửi máy chủ kèm vé. Có trang chủ cũ thì đi qua goiAPI (vé hết → xoá vé + số, về màn đăng nhập). Cú GHI không tự gửi lại. */
function vpGoi_(body) {
  if (typeof goiMayChu_ !== 'function' || typeof TOKEN_API === 'undefined') {
    return Promise.resolve({ ok: false, loi: 'Trang thiếu tệp cau-hinh.js hoặc goi-may-chu.js — báo quản trị. Chưa lưu gì.' });
  }
  var b = { token: TOKEN_API };
  for (var k in body) b[k] = body[k];
  if (typeof goiAPI === 'function') return goiAPI(b);
  var ve = '';
  try { ve = localStorage.getItem(VP_KHOA_VE) || ''; } catch (e) {}
  b.phien = ve;
  return goiMayChu_(b);
}
/** Câu khi máy chủ chưa có việc này (chưa đẩy bản 3.68 lên Apps Script). */
var VP_CHUA_368 = 'Máy chủ chưa lên bản 3.68 — chưa lưu gì. Quản trị cập nhật máy chủ (Apps Script) trước rồi tải lại trang.';
function vpCauLoi368_(kq) { return kq && kq.ma === 'SAI_HANH_DONG' ? VP_CHUA_368 : vpCauLoi_(kq); }
/** 📋 Chép `chu` (đang bày ở khung #idKhung). Không chép được (Zalo, máy cũ) thì bôi đen khung đó + chỉ cách tự chép — không im lặng. */
function vpChep_(chu, idKhung, idBao) {
  var k = vpEl_(idKhung), b = vpEl_(idBao);
  var bao = function (s) { if (b) { b.textContent = s; vpLop_(b, 'an', false); } };
  var boiDen = function () {
    try {
      var r = document.createRange(); r.selectNodeContents(k);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    } catch (e) {}
    bao('👆 Đã bôi đen sẵn — giữ tay vào chữ rồi chọn "Sao chép" (máy tính: Ctrl + C).');
  };
  try {
    navigator.clipboard.writeText(chu).then(function () { bao('✅ Đã chép — mở Zalo rồi dán.'); }, boiDen);
  } catch (e) { boiDen(); }
}
/** Câu đỏ dưới một ô của hộp (trống = tắt) + tô viền ô. */
function vpBaoO_(id, cau) {
  var o = vpEl_(id + '_loi'), h = vpEl_(id);
  if (o) { o.textContent = cau || ''; vpLop_(o, 'an', !cau); }
  if (h && h.classList) vpLop_(h, 'sai', !!cau);
}
function vpGiaO_(id) { var h = vpEl_(id); return h ? String(h.value == null ? '' : h.value) : ''; }
function vpBoDauHoa_(s) {
  var t = String(s == null ? '' : s);
  if (t.normalize) t = t.normalize('NFD').replace(new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'), '');
  return t.replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();
}

// ---------------- 3.68 vé 01 — ⚙ Quản trị → 🏭 Nhà máy ----------------
// hop: null | { sua: mã đang sửa ('' = thêm mới) } · xong: null | { nm, moi } · maTay: người đã tự gõ ô Mã (thôi gợi ý theo tên)
var vpQLNM = { dang: false, kq: null, loi: '', hop: null, xong: null, gui: false, mang: 'thoi_vu', maTay: false };
var VP_O_NM = { ten: 'vp_nm_ten', ma_ct: 'vp_nm_ma', loai: 'vp_nm_mang', zalo_chat_id: 'vp_nm_zalo', nhom: 'vp_nm_doi', khu_vuc: 'vp_nm_kv' };

function vpLayQLNM_() {
  if (vpQLNM.dang) return;
  vpQLNM.dang = true; vpQLNM.loi = '';
  vpGoi_({ hanh_dong: 'ct_ds' }).then(function (kq) {
    if (kq && kq.ok) vpQLNM.kq = kq;
    else if (kq && kq.ma === 'SAI_HANH_DONG') vpQLNM.loi = 'Máy chủ chưa lên bản 3.68 — quản trị cập nhật máy chủ (Apps Script) trước rồi tải lại trang.';
    else if (!(kq && kq.ma === 'HET_PHIEN')) vpQLNM.loi = vpCauLoi_(kq);
  }, function (e) { vpQLNM.loi = vpCauLoi_(e); }).then(function () {
    vpQLNM.dang = false;
    vpVeLai_();
  });
}
function vpNMCua_(ma) {
  var ds = (vpQLNM.kq && vpQLNM.kq.ds) || [];
  for (var i = 0; i < ds.length; i++) if (ds[i].ma_ct === ma) return ds[i];
  return null;
}
/** Mã gợi ý từ tên + mảng: "Vũ Hào" thời vụ → TV-VUHAO. */
function vpGoiYMa_(ten, mang) {
  var t = vpBoDauHoa_(ten).replace(/[^A-Z0-9]/g, '');
  return t ? (mang === 'chinh_thuc' ? 'CT-' : 'TV-') + t.substring(0, 36) : '';
}
function vpHtmlONM_(id, nhan, ghi, gt, them) {
  return '<label class="vp-nhan" for="' + id + '">' + nhan + (ghi ? ' <span class="vp-ghi-mo">— ' + ghi + '</span>' : '') + '</label>' +
    '<input class="vp-o-go" id="' + id + '" value="' + vpThoat_(gt) + '"' + (them || '') + '><div class="vp-loi-o an" id="' + id + '_loi"></div>';
}
function vpHtmlHopNM_() {
  var kq = vpQLNM.kq || {}, sua = vpQLNM.hop.sua, c = sua ? (vpNMCua_(sua) || {}) : { dang_dung: true };
  var ds = function (id, mang) {
    return '<datalist id="' + id + '">' + (mang || []).map(function (x) { return '<option value="' + vpThoat_(x) + '">'; }).join('') + '</datalist>';
  };
  return '<section class="vp-the vp-hop" id="vp_nm_hop"><div class="vp-nhom-ten">' + (sua ? '✏️ Sửa nhà máy' : '➕ Thêm nhà máy') + '</div>' +
    vpHtmlONM_('vp_nm_ten', 'Tên nhà máy', '', c.ten_cong_ty || '', ' placeholder="Ví dụ: Vũ Hào" autocomplete="off"') +
    (sua
      ? '<div class="vp-cho">Mảng <b>' + vpThoat_(c.ten_loai) + '</b> và mã <b>' + vpThoat_(c.ma_ct) + '</b> không đổi được ở đây: phiếu cũ, link đã '
        + 'gửi Zalo và giờ làm bên kế toán đều khớp theo mã.</div>'
      : '<div class="vp-nhan" id="vp_nm_mang_nhan">Mảng</div><div class="vp-chon" id="vp_nm_mang" role="group" aria-labelledby="vp_nm_mang_nhan">' +
        [['thoi_vu', 'Thời vụ'], ['chinh_thuc', 'Chính thức']].map(function (m) {
          return '<button type="button" class="vp-nut" data-nm-mang="' + m[0] + '" aria-pressed="' + (vpQLNM.mang === m[0]) + '">' + m[1] + '</button>';
        }).join('') + '</div><div class="vp-loi-o an" id="vp_nm_mang_loi"></div>' +
        vpHtmlONM_('vp_nm_ma', 'Mã', 'máy tự đặt theo tên, sửa được. Lưu rồi thì không đổi được', '', ' placeholder="TV-…" autocomplete="off" autocapitalize="characters"')) +
    vpHtmlONM_('vp_nm_doi', 'Đội quản', 'chọn đội đang có hoặc gõ đội mới. Trống = chỉ quản trị phân công được', c.nhom || '', ' list="vp_nm_ds_doi" autocomplete="off"') +
    ds('vp_nm_ds_doi', kq.ds_doi) +
    vpHtmlONM_('vp_nm_kv', 'Khu vực', 'ví dụ Bắc Giang', c.khu_vuc || '', ' list="vp_nm_ds_kv" autocomplete="off"') + ds('vp_nm_ds_kv', kq.ds_khu_vuc) +
    vpHtmlONM_('vp_nm_zalo', 'ID nhóm Zalo riêng', 'không bắt buộc. Để trống thì tin vào nhóm chung của mảng', c.zalo_chat_id || '', ' placeholder="zgr-…" autocomplete="off" autocapitalize="none"') +
    '<div class="vp-nhom-ghi">Nút tự lấy ID sẽ bổ sung sau. Tạm thời lấy bằng menu "LẤY ID NHÓM ZALO" trong Sheet rồi dán vào đây.</div>' +
    vpHtmlONM_('vp_nm_ghi', 'Ghi chú', 'không bắt buộc', c.ghi_chu || '', ' autocomplete="off"') +
    '<label class="vp-tich"><input type="checkbox" id="vp_nm_mo"' + (c.dang_dung ? ' checked' : '') + '> ' +
    (sua ? 'Đang tuyển (bỏ tích = tạm ngừng)' : 'Mở tuyển ngay') + '</label>' +
    '<div class="vp-loi an" id="vp_nm_loi" role="alert"></div>' +
    '<div class="vp-hang-nut"><button type="button" class="vp-nut-chinh" id="vp_nm_luu" data-nm="luu">💾 Lưu</button>' +
    '<button type="button" class="vp-nut" data-nm="huy">Huỷ</button></div></section>';
}
function vpHtmlXongNM_() {
  var x = vpQLNM.xong, n = x.nm;
  return '<section class="vp-the"><div class="vp-nhom-ten">' + (x.moi ? '✅ Đã thêm "' + vpThoat_(n.ten_cong_ty) + '"' : '🔗 Link đăng ký của "' +
      vpThoat_(n.ten_cong_ty) + '"') + '</div>' +
    (x.moi ? '<div class="vp-xong">' + (n.dang_dung ? 'Trang đăng ký đã thấy nhà máy này.' : 'Nhà máy đang tạm ngừng — bấm ✏️ Sửa để mở tuyển.') + '</div>' : '') +
    '<div class="vp-nhom-ghi">👉 Gửi link này cho người đi tuyển: mở ra là vào thẳng nhà máy này.</div>' +
    '<div class="vp-gui" id="vp_nm_link">' + vpThoat_(n.link) + '</div>' +
    (x.moi ? '<div class="vp-cho">Còn 2 việc: <b>Phân công đón</b> để giao người phụ trách · báo kế toán thêm nhà máy bên hệ công–lương với '
      + '<b>đúng mã ' + vpThoat_(n.ma_ct) + '</b> (lệch mã thì cột ⏱ Giờ không khớp).</div>' : '') +
    '<div class="vp-xong an" id="vp_nm_chep_bao" role="status"></div>' +
    '<div class="vp-hang-nut"><button type="button" class="vp-nut-chinh" data-nm="chep">📋 Chép link</button>' +
    '<button type="button" class="vp-nut" data-nm="xong">Xong</button></div></section>';
}
function vpBamNM_(viec, ma) {
  if (viec === 'them') { vpQLNM.hop = { sua: '' }; vpQLNM.mang = 'thoi_vu'; vpQLNM.maTay = false; vpVeMuc_(); var t = vpEl_('vp_nm_ten'); if (t && t.focus) t.focus(); }
  else if (viec === 'sua') { vpQLNM.hop = { sua: ma }; vpVeMuc_(); }
  else if (viec === 'link') { var c = vpNMCua_(ma); if (c) { vpQLNM.xong = { nm: c, moi: false }; vpVeMuc_(); } }
  else if (viec === 'huy') { vpQLNM.hop = null; vpVeMuc_(); }
  else if (viec === 'xong') { var moi = vpQLNM.xong && vpQLNM.xong.moi; vpQLNM.xong = null; if (moi) vpQLNM.kq = null; vpVeMuc_(); }
  else if (viec === 'chep' && vpQLNM.xong) vpChep_(vpQLNM.xong.nm.link, 'vp_nm_link', 'vp_nm_chep_bao');
  else if (viec === 'luu' && !vpQLNM.gui) vpLuuNM_();
}
function vpChonMangNM_(m) {
  vpQLNM.mang = m;
  var g = vpEl_('vp_nm_mang');
  if (g && g.querySelectorAll) [].forEach.call(g.querySelectorAll('[data-nm-mang]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-nm-mang') === m); });
  vpBaoO_('vp_nm_mang', '');
  vpGoiYMaNM_();
}
function vpGoiYMaNM_() {
  var o = vpEl_('vp_nm_ma');
  if (!o || vpQLNM.maTay) return;
  o.value = vpGoiYMa_(vpGiaO_('vp_nm_ten'), vpQLNM.mang);
}
function vpLuuNM_() {
  var sua = vpQLNM.hop.sua;
  var b = { hanh_dong: 'ct_luu', ten: vpGiaO_('vp_nm_ten').trim(), nhom: vpGiaO_('vp_nm_doi').trim(), khu_vuc: vpGiaO_('vp_nm_kv').trim(),
            zalo_chat_id: vpGiaO_('vp_nm_zalo').trim(), ghi_chu: vpGiaO_('vp_nm_ghi').trim(), dang_dung: !!(vpEl_('vp_nm_mo') || {}).checked };
  if (sua) { b.che_do = 'sua'; b.ma_ct = sua; }
  else { b.loai = vpQLNM.mang; b.ma_ct = vpGiaO_('vp_nm_ma').trim().toUpperCase(); }
  // Soát nhanh ở trang (máy chủ vẫn soát lại đủ luật)
  Object.keys(VP_O_NM).forEach(function (k) { vpBaoO_(VP_O_NM[k], ''); });
  vpBaoChung_('vp_nm_loi', '');
  var sai = false;
  if (!b.ten) { vpBaoO_('vp_nm_ten', 'Chưa gõ tên nhà máy.'); sai = true; }
  if (!sua && !/^(TV|CT)-[A-Z0-9]+(-[A-Z0-9]+)*$/.test(b.ma_ct)) {
    vpBaoO_('vp_nm_ma', 'Mã phải dạng ' + (b.loai === 'chinh_thuc' ? 'CT-' : 'TV-') + 'TENNHAMAY: chữ in hoa không dấu, số, gạch ngang.'); sai = true;
  }
  if (sai) return;
  vpQLNM.gui = true;
  var nut = vpEl_('vp_nm_luu');
  if (nut) { nut.disabled = true; nut.textContent = '⏳ Đang lưu… có khi phải chờ vài chục giây'; }
  vpGoi_(b).then(function (kq) {
    if (kq && kq.ok) {
      vpQLNM.hop = null;
      if (sua) { vpQLNM.kq = null; vpVeMuc_(); }
      else { vpQLNM.xong = { nm: kq.nha_may, moi: true }; vpVeMuc_(); }
      return;
    }
    if (kq && kq.ma === 'HET_PHIEN') return;
    if (kq && kq.o && VP_O_NM[kq.o]) vpBaoO_(VP_O_NM[kq.o], kq.loi);
    else vpBaoChung_('vp_nm_loi', vpCauLoi368_(kq));
  }, function () {
    vpBaoChung_('vp_nm_loi', 'Không nối được máy chủ — chưa chắc đã lưu. Bấm Huỷ rồi 🔄 Lấy lại danh sách: chưa thấy nhà máy thì thêm lại '
      + '(thêm trùng thì máy chủ tự từ chối, không sinh hai dòng).');
  }).then(function () {
    vpQLNM.gui = false;
    var n = vpEl_('vp_nm_luu');
    if (n) { n.disabled = false; n.textContent = '💾 Lưu'; }
  });
}
function vpBaoChung_(id, cau) {
  var o = vpEl_(id);
  if (o) { o.textContent = cau ? '⚠️ ' + cau : ''; vpLop_(o, 'an', !cau); }
}

// ---------------- 3.68 vé 02–04 — thêm / sửa / khoá người ----------------
// Ba mục cùng một khuôn, khác phạm vi (máy chủ lọc tk_ds theo vai): tai_khoan_quyen (quản trị) · doi_cua_toi (trưởng nhóm) · ctv_cua_toi
// (nhân viên Vận hành). Nút trên từng dòng theo `quyen` máy chủ trả — trang không tự suy quyền; máy chủ soát lại mỗi cú.
// hop: null | { viec: 'them'|'sua'|'mk'|'khoa'|'chuc', khoa } · xong: null | { tieu, chu, canh } · bao: câu ✅ sau khi lưu
var vpNG = { hop: null, xong: null, gui: false, loai: 'nv', bao: '' };
var VP_LOAI_THEM = { qt: ['nv', 'tn', 'ctv'], tn: ['nv', 'ctv'], nv: ['ctv'] };
var VP_TEN_LOAI = { nv: 'Nhân viên', tn: 'Trưởng nhóm', ctv: 'Cộng tác viên' };
var VP_O_NG = { ten_nguoi: 'vp_ng_ten', so_cccd: 'vp_ng_cccd', ten_dang_nhap: 'vp_ng_dn', sdt: 'vp_ng_sdt', nhom: 'vp_ng_doi', ten_tuyen: 'vp_ng_tt',
                mat_khau: 'vp_ng_mk', loai: 'vp_ng_loai' };
var VP_MUC_NG = {
  tai_khoan_quyen: { vai: 'qt', nut: '➕ Thêm người', chi: 'Mục này chỉ quản trị dùng được.',
    goi_y: '👉 Thêm nhân viên, trưởng nhóm, cộng tác viên: bấm <b>➕ Thêm người</b>. Khoá, đặt lại mật khẩu, lên / về trưởng nhóm: bấm nút ở dòng '
      + 'của người đó. Kế toán, hành chính, quản trị vẫn khai ở Sheet (tab NGUOI_DON).' },
  doi_cua_toi: { vai: 'tn', nut: '➕ Thêm thành viên', chi: 'Mục này dành cho trưởng nhóm.',
    goi_y: '👉 Thêm người vào đội mình: bấm <b>➕ Thêm thành viên</b>. Ai quên mật khẩu: <b>🔑 Đặt lại</b>. Người nghỉ việc: <b>🔒 Khoá</b> '
      + '(không xoá — mở lại được).' },
  ctv_cua_toi: { vai: 'nv', nut: '➕ Thêm cộng tác viên', chi: 'Mục này dành cho nhân viên Vận hành.',
    goi_y: '👉 Thêm cộng tác viên của bạn: bấm <b>➕ Thêm cộng tác viên</b>. Họ chỉ xem được người mình tuyển và giờ làm, không sửa được gì.' }
};
function vpVaiToi_(tk) {
  if (!tk) return '';
  if (tk.la_quan_tri) return 'qt';
  if (tk.phong !== undefined && tk.phong !== 'van_hanh') return '';
  return tk.la_truong_nhom ? 'tn' : 'nv';
}
function vpNguoiCua_(khoa) {
  var ds = (vpTKQ.kq && vpTKQ.kq.ds) || [];
  for (var i = 0; i < ds.length; i++) if (ds[i].khoa_tk === khoa) return ds[i];
  return null;
}
function vpTaoMk_() {
  var c = 'abcdefghjkmnpqrstuvwxyz23456789', s = '', so = [];
  try { so = Array.prototype.slice.call(window.crypto.getRandomValues(new Uint32Array(8))); } catch (e) {}
  for (var i = 0; i < 8; i++) s += c.charAt((so[i] !== undefined ? so[i] : Math.floor(Math.random() * 1e9)) % c.length);
  return s;
}
function vpHtmlOMk_(nhan) {
  return '<label class="vp-nhan" for="vp_ng_mk">' + nhan + ' <span class="vp-ghi-mo">— từ 6 ký tự</span></label>' +
    '<div class="vp-hang-nut vp-kem"><input class="vp-o-go" id="vp_ng_mk" autocomplete="off" autocapitalize="none">' +
    '<button type="button" class="vp-nut" data-ng="tao_mk">🎲 Tạo giúp</button></div><div class="vp-loi-o an" id="vp_ng_mk_loi"></div>';
}
/** Ô Đội: quản trị gõ / chọn đội đang có · trưởng nhóm, nhân viên: đội của mình (hai đội thì chọn). */
function vpHtmlODoi_(vai, gt) {
  var tk = vpTK_().tk || {}, cua = (tk.ds_nhom || []).map(function (g) { return String(g).toUpperCase(); });
  if (vai === 'qt') {
    var doi = vpDem_((vpTKQ.kq && vpTKQ.kq.ds) || [], 'nhom').join(', ').split(', ').filter(function (x, i, a) { return x && a.indexOf(x) === i; }).sort();
    return vpHtmlONM_('vp_ng_doi', 'Đội', 'chọn đội đang có hoặc gõ đội mới', gt || '', ' list="vp_ng_ds_doi" autocomplete="off"') +
      '<datalist id="vp_ng_ds_doi">' + doi.map(function (x) { return '<option value="' + vpThoat_(x) + '">'; }).join('') + '</datalist>';
  }
  if (cua.length > 1) {
    return '<label class="vp-nhan" for="vp_ng_doi">Đội</label><select class="vp-o-go" id="vp_ng_doi"><option value="">Chọn đội…</option>' +
      cua.map(function (g) { return '<option value="' + vpThoat_(g) + '">' + vpThoat_(g) + '</option>'; }).join('') + '</select><div class="vp-loi-o an" id="vp_ng_doi_loi"></div>';
  }
  return '<div class="vp-nhom-ghi">Đội: <b>' + vpThoat_(cua[0] || 'chưa có đội') + '</b> (đội của bạn)</div><div class="vp-loi-o an" id="vp_ng_doi_loi"></div>';
}
function vpHtmlHopNG_(vai) {
  var h = vpNG.hop, p = h.khoa ? (vpNguoiCua_(h.khoa) || {}) : {};
  var nut = '<div class="vp-loi an" id="vp_ng_loi" role="alert"></div><div class="vp-hang-nut"><button type="button" class="vp-nut-chinh" id="vp_ng_luu" data-ng="luu">';
  var huy = '<button type="button" class="vp-nut" data-ng="huy">';
  if (h.viec === 'khoa') {
    return '<section class="vp-the vp-hop"><div class="vp-nhom-ten">' + (p.khoa ? '🔓 Mở lại tài khoản của ' : '🔒 Khoá tài khoản của ') + vpThoat_(p.ten_nguoi) + '?</div>' +
      '<div class="vp-nhom-ghi">' + (p.khoa ? 'Người này đăng nhập lại được bằng mật khẩu cũ.'
        : 'Người này <b>không đăng nhập được nữa</b>, máy đang mở cũng bị đẩy ra ở lần bấm sau. Phiếu, sổ lao động, báo cáo cũ của họ <b>giữ nguyên</b>. '
          + 'Mở lại được bất cứ lúc nào.') + '</div>' + nut + (p.khoa ? '🔓 Mở lại' : '🔒 Khoá') + '</button>' + huy + 'Không, quay lại</button></div></section>';
  }
  if (h.viec === 'chuc') {
    var len = p.loai === 'nv';
    var cu = len ? ((vpTKQ.kq && vpTKQ.kq.ds) || []).filter(function (r) {
      return r.loai === 'tn' && p.nhom && r.nhom.split(', ').some(function (g) { return p.nhom.split(', ').indexOf(g) >= 0; });
    }).map(function (r) { return r.ten_nguoi; }) : [];
    return '<section class="vp-the vp-hop"><div class="vp-nhom-ten">' + (len ? '⬆ Cho ' : '⬇ Cho ') + vpThoat_(p.ten_nguoi) + (len ? ' lên trưởng nhóm' : ' về nhân viên') +
      (p.nhom ? ' (đội ' + vpThoat_(p.nhom) + ')' : '') + '?</div><div class="vp-nhom-ghi">' +
      (len ? 'Người này sẽ thấy cả đội và phân công đón được.' + (cu.length ? ' Đội đang có trưởng nhóm: <b>' + cu.map(vpThoat_).join(', ') +
        '</b> — người đó <b>vẫn là trưởng nhóm</b> cho tới khi bạn bấm ⬇ Về nhân viên.' : '')
        : 'Người này chỉ còn thấy nhà máy được giao, không phân công đón được nữa.') + '</div>' +
      nut + (len ? '⬆ Lên trưởng nhóm' : '⬇ Về nhân viên') + '</button>' + huy + 'Không, quay lại</button></div></section>';
  }
  if (h.viec === 'mk') {
    return '<section class="vp-the vp-hop"><div class="vp-nhom-ten">🔑 Đặt lại mật khẩu — ' + vpThoat_(p.ten_nguoi) + '</div>' +
      '<div class="vp-nhom-ghi">Mật khẩu cũ hết dùng được ngay. Máy nào đang đăng nhập tài khoản này sẽ bị đẩy ra.</div>' +
      vpHtmlOMk_('Mật khẩu mới') + nut + '🔑 Đặt lại</button>' + huy + 'Huỷ</button></div></section>';
  }
  var sua = h.viec === 'sua', ds = VP_LOAI_THEM[vai] || [];
  return '<section class="vp-the vp-hop"><div class="vp-nhom-ten">' + (sua ? '✏️ Sửa — ' + vpThoat_(p.ten_nguoi) : '➕ Thêm người') + '</div>' +
    (sua ? '<div class="vp-nhom-ghi">' + vpThoat_(p.ten_loai) + ' · ' + (p.so_cccd ? 'căn cước ' + vpThoat_(p.so_cccd) : 'tên đăng nhập ' + vpThoat_(p.ten_dang_nhap)) +
        '. Số căn cước, tên đăng nhập không sửa được ở đây.</div>'
      : ds.length > 1 ? '<div class="vp-nhan" id="vp_ng_loai_nhan">Người này là</div><div class="vp-chon" id="vp_ng_loai" role="group" aria-labelledby="vp_ng_loai_nhan">' +
        ds.map(function (l) { return '<button type="button" class="vp-nut" data-ng-loai="' + l + '" aria-pressed="' + (vpNG.loai === l) + '">' + VP_TEN_LOAI[l] + '</button>'; }).join('') +
        '</div><div class="vp-loi-o an" id="vp_ng_loai_loi"></div>'
      : '<div class="vp-nhom-ghi">Cộng tác viên chỉ xem được người mình tuyển và giờ làm của họ.</div>') +
    vpHtmlONM_('vp_ng_ten', 'Họ tên', '', p.ten_nguoi || '', ' autocomplete="off"') +
    (sua ? '' : vpHtmlONM_('vp_ng_cccd', 'Số căn cước', '12 số, dùng để đăng nhập', '', ' inputmode="numeric" autocomplete="off"') +
      '<div id="vp_ng_dn_khoi" class="' + (vpNG.loai === 'ctv' ? '' : 'an') + '">' +
      vpHtmlONM_('vp_ng_dn', 'Tên đăng nhập', 'chỉ khi cộng tác viên là công ty, không có căn cước', '', ' autocomplete="off" autocapitalize="none"') + '</div>') +
    vpHtmlONM_('vp_ng_sdt', 'Số điện thoại', '', p.sdt || '', ' inputmode="tel" autocomplete="off"') +
    (sua ? (vai === 'qt' && !p.nhieu_doi ? vpHtmlODoi_(vai, p.nhom) : '') : vpHtmlODoi_(vai, '')) +
    vpHtmlONM_('vp_ng_tt', 'Tên hay gõ ở ô "Người tuyển dụng"', 'nhiều tên thì cách nhau dấu phẩy', p.ten_tuyen || '', ' placeholder="Ví dụ: Lan, Chị Lan" autocomplete="off"') +
    (sua ? '' : vpHtmlOMk_('Mật khẩu')) + nut + '💾 Lưu</button>' + huy + 'Huỷ</button></div></section>';
}
function vpHtmlXongNG_() {
  var x = vpNG.xong;
  return '<section class="vp-the"><div class="vp-nhom-ten">' + vpThoat_(x.tieu) + '</div>' +
    (x.canh && x.canh.length ? '<div class="vp-cho">⚠️ Đã lưu nhưng chưa dùng được ngay: ' + x.canh.map(vpThoat_).join('; ') + '. Mở ⚙ Tài khoản & quyền xem lý do.</div>' : '') +
    '<div class="vp-nhom-ghi">👉 Chép khung dưới gửi Zalo cho người này.</div><div class="vp-gui" id="vp_ng_gui">' + vpThoat_(x.chu) + '</div>' +
    '<div class="vp-cho"><b>Mật khẩu chỉ hiện lần này.</b> Đóng khung là không ai đọc lại được, kể cả trong Sheet. Quên thì bấm 🔑 Đặt lại mật khẩu.</div>' +
    '<div class="vp-xong an" id="vp_ng_chep_bao" role="status"></div>' +
    '<div class="vp-hang-nut"><button type="button" class="vp-nut-chinh" data-ng="chep">📋 Chép để gửi</button>' +
    '<button type="button" class="vp-nut" data-ng="xong">Xong</button></div></section>';
}
function vpChonLoaiNG_(l) {
  vpNG.loai = l;
  var g = vpEl_('vp_ng_loai');
  if (g && g.querySelectorAll) [].forEach.call(g.querySelectorAll('[data-ng-loai]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-ng-loai') === l); });
  var k = vpEl_('vp_ng_dn_khoi');
  if (k) vpLop_(k, 'an', l !== 'ctv');
  vpBaoO_('vp_ng_loai', '');
}
function vpBamNG_(viec, khoa) {
  var vai = vpVaiToi_(vpTK_().tk);
  if (viec === 'them') { vpNG.hop = { viec: 'them' }; vpNG.loai = (VP_LOAI_THEM[vai] || ['nv'])[0]; vpNG.bao = ''; vpVeMuc_(); }
  else if (viec === 'sua' || viec === 'mk' || viec === 'khoa' || viec === 'chuc') { vpNG.hop = { viec: viec, khoa: khoa }; vpNG.bao = ''; vpVeMuc_(); }
  else if (viec === 'huy') { vpNG.hop = null; vpVeMuc_(); }
  else if (viec === 'tao_mk') { var o = vpEl_('vp_ng_mk'); if (o) o.value = vpTaoMk_(); vpBaoO_('vp_ng_mk', ''); }
  else if (viec === 'chep' && vpNG.xong) vpChep_(vpNG.xong.chu, 'vp_ng_gui', 'vp_ng_chep_bao');
  else if (viec === 'xong') { vpNG.xong = null; vpTKQ.kq = null; vpVeMuc_(); }
  else if (viec === 'luu' && !vpNG.gui && vpNG.hop) vpLuuNG_(vai);
}
function vpLuuNG_(vai) {
  var h = vpNG.hop, p = h.khoa ? (vpNguoiCua_(h.khoa) || {}) : {}, b;
  Object.keys(VP_O_NG).forEach(function (k) { vpBaoO_(VP_O_NG[k], ''); });
  vpBaoChung_('vp_ng_loi', '');
  if (h.viec === 'khoa') b = { hanh_dong: 'tk_khoa', khoa_tk: h.khoa, khoa: !p.khoa };
  else if (h.viec === 'chuc') b = { hanh_dong: 'tk_chuc', khoa_tk: h.khoa, len: p.loai === 'nv' };
  else {
    var mk = vpGiaO_('vp_ng_mk');
    if (h.viec !== 'sua' && mk.length < 6) { vpBaoO_('vp_ng_mk', 'Mật khẩu phải từ 6 ký tự. Bấm 🎲 để máy tạo giúp.'); return; }
    if (h.viec === 'mk') b = { hanh_dong: 'tk_dat_mk', khoa_tk: h.khoa, mat_khau: mk };
    else {
      var ten = vpGiaO_('vp_ng_ten').trim();
      if (!ten) { vpBaoO_('vp_ng_ten', 'Chưa gõ họ tên.'); return; }
      b = { hanh_dong: h.viec === 'sua' ? 'tk_sua' : 'tk_them', ten_nguoi: ten, sdt: vpGiaO_('vp_ng_sdt').trim(), ten_tuyen: vpGiaO_('vp_ng_tt').trim() };
      // Ô đội có trên hộp khi: quản trị (trừ người hai đội lúc sửa) · thêm người mà mình ở hai đội (chọn). Một đội → máy chủ tự lấy.
      var nhieuDoi = ((vpTK_().tk || {}).ds_nhom || []).length > 1;
      if (vai === 'qt' ? !(h.viec === 'sua' && p.nhieu_doi) : h.viec === 'them' && nhieuDoi) b.nhom = vpGiaO_('vp_ng_doi').trim();
      if (h.viec === 'sua') b.khoa_tk = h.khoa;
      else {
        b.loai = vpNG.loai; b.so_cccd = vpGiaO_('vp_ng_cccd').replace(/\D/g, ''); b.mat_khau = mk;
        if (vpNG.loai === 'ctv') b.ten_dang_nhap = vpGiaO_('vp_ng_dn').trim();
      }
    }
  }
  vpNG.gui = true;
  var nut = vpEl_('vp_ng_luu'), chuNut = nut ? nut.textContent : '';
  if (nut) { nut.disabled = true; nut.textContent = '⏳ Đang lưu… có khi phải chờ vài chục giây'; }
  var mkGui = b.mat_khau;
  vpGoi_(b).then(function (kq) {
    if (kq && kq.ok) {
      vpNG.hop = null;
      if (b.hanh_dong === 'tk_them' || b.hanh_dong === 'tk_dat_mk') {
        var t = kq.tai_khoan || {};
        vpNG.xong = { tieu: (b.hanh_dong === 'tk_them' ? '✅ Đã thêm ' : '✅ Đã đặt lại mật khẩu cho ') + (t.ten_nguoi || b.ten_nguoi || p.ten_nguoi || ''),
                      chu: 'Trang chủ: ' + (kq.link || '') + '\nTên đăng nhập: ' + (t.ten_dang_nhap || '') + '\nMật khẩu: ' + mkGui, canh: kq.canh_bao || [] };
      } else {
        vpNG.bao = b.hanh_dong === 'tk_khoa' ? (b.khoa ? '✅ Đã khoá ' : '✅ Đã mở lại ') + (p.ten_nguoi || '')
          : b.hanh_dong === 'tk_chuc' ? '✅ ' + (p.ten_nguoi || '') + (b.len ? ' đã là trưởng nhóm' : ' đã về nhân viên') : '✅ Đã lưu ' + b.ten_nguoi;
        vpTKQ.kq = null;
      }
      vpVeMuc_();
      return;
    }
    if (kq && kq.ma === 'HET_PHIEN') return;
    if (kq && kq.o && VP_O_NG[kq.o] && vpEl_(VP_O_NG[kq.o] + '_loi')) vpBaoO_(VP_O_NG[kq.o], kq.loi);
    else vpBaoChung_('vp_ng_loi', vpCauLoi368_(kq));
  }, function () {
    vpBaoChung_('vp_ng_loi', 'Không nối được máy chủ — chưa chắc đã lưu. Bấm Huỷ rồi 🔄 Lấy lại để xem; thêm lại người trùng số căn cước thì máy chủ tự từ chối.');
  }).then(function () {
    vpNG.gui = false;
    var n = vpEl_('vp_ng_luu');
    if (n) { n.disabled = false; n.textContent = chuNut; }
  });
}
/** Ba mục người dùng chung một hàm vẽ. */
function vpHtmlNguoi_(muc) {
  var m = VP_MUC_NG[muc], q = vpTK_(), vai = vpVaiToi_(q.tk);
  var dau = '<div class="vp-goi-y">' + m.goi_y + '</div>';
  if (q.tk && vai !== m.vai) return dau + '<div class="vp-loi">⚠️ ' + m.chi + '</div>';
  if (vpNG.xong) return vpHtmlXongNG_();
  if (typeof moBang_ !== 'function') return dau + '<div class="vp-loi">⚠️ Trang thiếu tệp bang-chung.js — tải lại trang (máy tính: Ctrl + F5).</div>';
  if (!vpTKQ.kq && !vpTKQ.loi) vpLayTKQ_();
  if (!vpTKQ.kq) return dau + (vpTKQ.loi ? vpHtmlLoi_(vpTKQ.loi, 'tk_ds') : VP_CHO);
  if (vpNG.hop) return vpHtmlHopNG_(vai);
  var kq = vpTKQ.kq, laQT = vai === 'qt';
  var nutViec = { k: 'viec', ten: 'Việc', khong_xuat: true, ve: function (r) {
    var q2 = r.quyen || {}, n = '', k = ' data-khoa="' + vpThoat_(r.khoa_tk) + '"';
    if (q2.sua) n += '<button type="button" class="vp-nut" data-ng="sua"' + k + '>✏️ Sửa</button>';
    if (q2.mk) n += '<button type="button" class="vp-nut" data-ng="mk"' + k + '>🔑 Đặt lại mật khẩu</button>';
    if (q2.chuc) n += '<button type="button" class="vp-nut" data-ng="chuc"' + k + '>' + (r.loai === 'nv' ? '⬆ Lên trưởng nhóm' : '⬇ Về nhân viên') + '</button>';
    if (q2.khoa) n += '<button type="button" class="vp-nut" data-ng="khoa"' + k + '>' + (r.khoa ? '🔓 Mở lại' : '🔒 Khoá') + '</button>';
    return n ? '<span class="vp-hang-nut vp-nut-o">' + n + '</span>' : '<span class="vp-ghi-mo">' + (laQT ? 'Sửa ở Sheet' : '—') + '</span>';
  } };
  var tinhTrang = { k: 'tinh_trang', ten: 'Tình trạng', ve: function (r) {
    return '<span class="' + (r.dung_duoc ? 'vp-tot' : 'vp-xau') + '">' + (r.dung_duoc ? '✅ ' : '⚠️ ') + vpThoat_(r.tinh_trang) + '</span>';
  } };
  vpSauVe = function () {
    moBang_(vpEl_('vp_bang'), { id: muc, tep: muc.replace(/_/g, '-'), dong: kq.ds, the_tieu_de: 'ten_nguoi', the_nhan: 'tinh_trang',
      rong: laQT ? 'Tab NGUOI_DON chưa có ai.' : muc === 'ctv_cua_toi' ? 'Bạn chưa có cộng tác viên nào — bấm ➕ Thêm cộng tác viên.' : 'Đội chưa có ai.',
      tim: ['ten_nguoi', 'ten_dang_nhap', 'so_cccd', 'nhom', 'ten_tuyen'],
      loc: laQT ? [{ k: 'phong', ten: 'Phòng', ds: vpDem_(kq.ds, 'ten_phong'), khop: function (r, v) { return r.ten_phong === v; } },
                   { k: 'tinh_trang', ten: 'Tình trạng', ds: vpDem_(kq.ds, 'tinh_trang'), khop: function (r, v) { return r.tinh_trang === v; } }] : [],
      tong: function (ds) {
        var tot = ds.filter(function (r) { return r.dung_duoc; }).length;
        return 'Tổng: <b>' + ds.length + '</b> tài khoản · ✅ <b>' + tot + '</b> dùng được' +
          (ds.length - tot ? ' · ⚠️ <b>' + (ds.length - tot) + '</b> cần xử lý' : '');
      },
      cot: laQT
        ? [{ k: 'ten_nguoi', ten: 'Tên' }, { k: 'ten_dang_nhap', ten: 'Tên đăng nhập' }, { k: 'so_cccd', ten: 'Số căn cước' },
           { k: 'ten_phong', ten: 'Phòng' }, { k: 'ten_chuc_vu', ten: 'Chức vụ' }, { k: 'nhom', ten: 'Nhóm' },
           { k: 'ten_tuyen', ten: 'Tên tuyển', md: false }, { k: 'lan_dang_nhap', ten: 'Đăng nhập gần nhất' },
           { k: 'co_mat_khau', ten: 'Có mật khẩu', chu: function (r) { return r.co_mat_khau ? 'Có' : 'Chưa'; } },
           { k: 'khoa', ten: 'Khoá', chu: function (r) { return r.khoa ? 'Bị khoá' : ''; } }, tinhTrang,
           { k: 'nhac', ten: 'Cần sửa / nhắc', md: false }, { k: 'so_dong', ten: 'Số dòng ở Sheet', so: true, md: false },
           { k: 'ten_loai', ten: 'Loại', md: false }, { k: 'nguoi_them', ten: 'Người thêm', md: false }, { k: 'ngay_them', ten: 'Ngày thêm', md: false },
           nutViec]
        : [{ k: 'ten_nguoi', ten: 'Tên' }, { k: 'ten_loai', ten: 'Loại' }, { k: 'so_cccd', ten: 'Số căn cước' }, { k: 'ten_dang_nhap', ten: 'Tên đăng nhập' },
           { k: 'sdt', ten: 'Điện thoại' }, { k: 'nhom', ten: 'Đội' }, { k: 'ten_tuyen', ten: 'Tên tuyển' }, tinhTrang,
           { k: 'lan_dang_nhap', ten: 'Đăng nhập gần nhất', md: false }, nutViec] });
  };
  var hong = kq.loi_dong || [];
  return dau + (vpNG.bao ? '<div class="vp-xong" role="status">' + vpThoat_(vpNG.bao) + '</div>' : '') +
    (hong.length ? '<div class="vp-cho">⚠️ <b>' + hong.length + ' dòng hỏng</b> ở tab NGUOI_DON — không thành tài khoản:<br>' +
      hong.map(vpThoat_).join('<br>') + '</div>' : '') +
    '<div class="vp-hang-nut"><button type="button" class="vp-nut-chinh" data-ng="them">' + m.nut + '</button>' +
    '<button type="button" class="vp-nut" data-thu-lai="tk_ds"' + (vpTKQ.dang ? ' disabled' : '') + '>' +
    (vpTKQ.dang ? '⏳ Đang lấy bản mới…' : '🔄 Lấy lại') + '</button></div>' +
    (vpTKQ.loi ? '<div class="vp-loi">⚠️ Chưa lấy được bản mới: ' + vpThoat_(vpTKQ.loi) + ' Đang hiện bản lấy lúc trước.</div>' : '') +
    '<div class="vp-bang" id="vp_bang"></div>';
}

var VP_TRANG = {
  doi_cua_toi: function () { return vpHtmlNguoi_('doi_cua_toi'); },
  ctv_cua_toi: function () { return vpHtmlNguoi_('ctv_cua_toi'); },
  quan_ly_nha_may: function () {
    var dau = '<div class="vp-goi-y">👉 Thêm nhà máy mới ở đây: bấm <b>➕ Thêm nhà máy</b>. Lưu xong là trang đăng ký thấy ngay, không phải mở Sheet.</div>';
    var q = vpTK_();
    if (q.tk && !q.tk.la_quan_tri) return dau + '<div class="vp-loi">⚠️ Mục này chỉ quản trị dùng được.</div>';
    if (vpQLNM.xong) return vpHtmlXongNM_();
    if (!vpQLNM.kq && !vpQLNM.loi) vpLayQLNM_();
    if (!vpQLNM.kq) return dau + (vpQLNM.loi ? vpHtmlLoi_(vpQLNM.loi, 'ct_ds') : VP_CHO);
    if (vpQLNM.hop) return vpHtmlHopNM_();
    if (typeof moBang_ !== 'function') return dau + '<div class="vp-loi">⚠️ Trang thiếu tệp bang-chung.js — tải lại trang (máy tính: Ctrl + F5).</div>';
    var kq = vpQLNM.kq, bn = kq.bo_nho || {};
    vpSauVe = function () {
      moBang_(vpEl_('vp_bang'), { id: 'quan_ly_nha_may', tep: 'nha-may', dong: kq.ds, the_tieu_de: 'ten_cong_ty', the_nhan: 'dang_dung',
        rong: 'Chưa có nhà máy nào — bấm ➕ Thêm nhà máy.', tim: ['ten_cong_ty', 'ma_ct', 'nhom', 'khu_vuc'],
        loc: [{ k: 'loai', ten: 'Mảng', ds: [['thoi_vu', 'Thời vụ'], ['chinh_thuc', 'Chính thức']], khop: function (r, v) { return r.loai === v; } },
              { k: 'dang_dung', ten: 'Tình trạng', ds: [['co', 'Đang tuyển'], ['khong', 'Tạm ngừng']],
                khop: function (r, v) { return r.dang_dung === (v === 'co'); } }],
        tong: function (ds) {
          var mo = ds.filter(function (r) { return r.dang_dung; }).length;
          return 'Tổng: <b>' + ds.length + '</b> nhà máy · ✅ <b>' + mo + '</b> đang tuyển' + (ds.length - mo ? ' · ⏸ <b>' + (ds.length - mo) + '</b> tạm ngừng' : '');
        },
        cot: [{ k: 'ten_cong_ty', ten: 'Tên' }, { k: 'ma_ct', ten: 'Mã' }, { k: 'ten_loai', ten: 'Mảng' }, { k: 'nhom', ten: 'Đội' },
              { k: 'khu_vuc', ten: 'Khu vực' },
              { k: 'zalo_chat_id', ten: 'Nhóm Zalo riêng', chu: function (r) { return r.zalo_chat_id ? 'Có' : 'Dùng nhóm chung'; } },
              { k: 'dang_dung', ten: 'Tình trạng', chu: function (r) { return r.dang_dung ? 'Đang tuyển' : 'Tạm ngừng'; },
                ve: function (r) { return r.dang_dung ? '<span class="vp-tot">✅ Đang tuyển</span>' : '<span class="vp-xau">⏸ Tạm ngừng</span>'; } },
              { k: 'ghi_chu', ten: 'Ghi chú', md: false }, { k: 'link', ten: 'Link đăng ký', md: false },
              { k: 'viec', ten: 'Việc', khong_xuat: true, ve: function (r) {
                return '<span class="vp-hang-nut vp-nut-o"><button type="button" class="vp-nut" data-nm="sua" data-ma="' + vpThoat_(r.ma_ct) + '">✏️ Sửa</button>' +
                  '<button type="button" class="vp-nut" data-nm="link" data-ma="' + vpThoat_(r.ma_ct) + '">🔗 Link</button></span>';
              } }] });
    };
    return dau +
      (bn.tran && bn.dung > bn.tran * 0.8 ? '<div class="vp-cho">⚠️ Bộ nhớ danh sách nhà máy đã dùng ' + Math.round(bn.dung * 100 / bn.tran) +
        '%. Gần đầy thì không thêm được nữa — xoá ở tab CONGTY các dòng nhà máy đã thôi hẳn.</div>' : '') +
      '<div class="vp-hang-nut"><button type="button" class="vp-nut-chinh" data-nm="them">➕ Thêm nhà máy</button>' +
      '<button type="button" class="vp-nut" data-thu-lai="ct_ds"' + (vpQLNM.dang ? ' disabled' : '') + '>' +
      (vpQLNM.dang ? '⏳ Đang lấy bản mới…' : '🔄 Lấy lại') + '</button></div>' +
      (vpQLNM.loi ? '<div class="vp-loi">⚠️ Chưa lấy được bản mới: ' + vpThoat_(vpQLNM.loi) + ' Đang hiện bản lấy lúc trước.</div>' : '') +
      '<div class="vp-bang" id="vp_bang"></div>';
  },
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
  // 3.65 vé 05: chỉ xem · 3.68 vé 02–03: thêm / sửa / khoá ngay trên trang (máy chủ chặn quyền). Chỉ quản trị.
  tai_khoan_quyen: function () { return vpHtmlNguoi_('tai_khoan_quyen'); }
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
  // 3.68 — 🏭 Nhà máy
  var nm = e.target && e.target.closest ? e.target.closest('[data-nm]') : null;
  if (nm) { vpBamNM_(nm.getAttribute('data-nm'), nm.getAttribute('data-ma')); return; }
  var mg = e.target && e.target.closest ? e.target.closest('[data-nm-mang]') : null;
  if (mg) { vpChonMangNM_(mg.getAttribute('data-nm-mang')); return; }
  // 3.68 — thêm / sửa / khoá người
  var ng = e.target && e.target.closest ? e.target.closest('[data-ng]') : null;
  if (ng) { vpBamNG_(ng.getAttribute('data-ng'), ng.getAttribute('data-khoa')); return; }
  var lo = e.target && e.target.closest ? e.target.closest('[data-ng-loai]') : null;
  if (lo) { vpChonLoaiNG_(lo.getAttribute('data-ng-loai')); return; }
  var b = e.target && e.target.closest ? e.target.closest('[data-thu-lai]') : null;
  if (!b) return;
  if (b.getAttribute('data-thu-lai') === 'nha_may') { vpNM.loi = ''; vpLayNhaMay_(); }
  else if (b.getAttribute('data-thu-lai') === 'tk_ds') { vpTKQ.loi = ''; vpLayTKQ_(); }
  else if (b.getAttribute('data-thu-lai') === 'ct_ds') { vpQLNM.loi = ''; vpLayQLNM_(); }
  else { vpCK.loi = ''; vpLayCongKhai_(); }
  vpVeMuc_();
});
// 3.65 — ô mật khẩu: gõ lại thì câu đỏ của ô đó tắt; Enter = Lưu
vpEl_('vp_trang').addEventListener('input', function (e) {
  var id = e.target && e.target.id;
  if (VP_O_MK.some(function (o) { return o[0] === id; })) vpBaoMk_(id, '');
  // 3.68 — 🏭 Nhà máy: gõ tên → gợi ý mã (tới khi người dùng tự gõ ô Mã); gõ lại ô nào thì câu đỏ ô đó tắt
  if (id === 'vp_nm_ten') vpGoiYMaNM_();
  if (id === 'vp_nm_ma') vpQLNM.maTay = !!vpGiaO_('vp_nm_ma');
  if (id && (id.indexOf('vp_nm_') === 0 || id.indexOf('vp_ng_') === 0)) vpBaoO_(id, '');
});
vpEl_('vp_trang').addEventListener('keydown', function (e) {
  var id = e.target && e.target.id;
  if (e.key === 'Enter' && !vpDangMk && VP_O_MK.some(function (o) { return o[0] === id; })) vpLuuMk_();
});
window.addEventListener('hashchange', vpTheoDuong_);

// Vẽ lần đầu khi cả trang (kể cả khối mã cũ) đã chạy xong. Mã cũ đổi màn trước đó thì vpDoiMan_ đã vẽ phần của nó.
vpMuc = vpDocDuong_();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vpVe_); else vpVe_();
