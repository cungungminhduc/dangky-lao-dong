/* ============================================================
 * THANH MENU TRÊN CÙNG — dùng chung cho trang chủ (khung Văn phòng) và 8 trang riêng (bản 3.64.1, vé 06 — DAC-TA 0.21)
 * ============================================================
 * Dương 06/11/2026: "dù chọn cái nào cũng giữ nguyên thanh trên cùng" → cách A: MỘT bảng menu `VP_MENU` cho cả hệ.
 *   - Trang chủ: thanh có sẵn trong trangchu.html; vanphong.js gọi vpVeThanh_() mỗi lần đổi mục.
 *   - Trang riêng (danh sách gọi, phân công, quân số, dữ liệu tuyển, nhập bù, giờ làm, hồ sơ scan, biểu đồ): chưa có #vp_thanh →
 *     tệp này chèn thanh lên đầu <body>, tô việc đang mở; việc nằm trong khung (🏢 Công ty) trỏ trangchu.html#…
 *     Thanh ở trang riêng KHÔNG dính đỉnh (các trang có phần dính riêng) — vanphong.css. Điện thoại: "◀ Trang chủ" + 👤 (DAC-TA 0.18).
 *   - Thiếu tệp này → trang riêng y như cũ (nút "🏠 Về Trang chủ" của trang còn nguyên, chỉ bị ẩn khi có thanh).
 * Nạp SAU goi-may-chu.js (và goi-dau.js nếu trang có — để biết quyền), TRƯỚC khối mã của trang. Kiểu ở vanphong.css.
 * KHÔNG gắn ở trang cổng nhà máy (index.html, doncong.html) và trang hệ công–lương.
 * 3.66.1: chuông 🔔 có số đỏ (tin chưa đọc) ở góc phải, ngay trước nút 👤 — vpVeChuong_().
 */

// MỘT bảng dựng cả thanh menu lẫn ô việc ở trang chủ của khách. `ghi` là HTML viết sẵn ở đây, không có dữ liệu người dùng.
// `can`: '' = ai cũng thấy · 'van_hanh' = phòng Vận hành (+ quản trị) · 'phan_cong' = trưởng nhóm / quản trị phòng Vận hành ·
//        'du_lieu_tuyen' = Vận hành đã được khai tên tuyển (cờ xem_du_lieu_tuyen) · 'quan_tri' = chỉ quản trị (3.65).
//        Đầu mục không còn việc nào thì không hiện.
// `cu`: việc có trang riêng (mở trang đó); không có `cu` = mục nằm trong khung trang chủ.
var VP_MENU = [
  { id: 'cong_ty', ten: 'Công ty', bt: '🏢', ghi: 'Ai cũng xem được, không cần đăng nhập.', viec: [
    { id: 'thong_tin_cong_ty', ten: 'Thông tin công ty', bt: '🏷️', mt: 'Tên, mã số thuế, địa chỉ, điện thoại' },
    { id: 'nha_may_dang_tuyen', ten: 'Nhà máy đang tuyển', bt: '🏭', mt: 'Nơi đang nhận người' },
    { id: 'thong_bao', ten: 'Thông báo chung', bt: '📢', mt: 'Tin mới cho mọi người' }] },
  // 3.66: hộp thông báo là HỆ RIÊNG (trang trungtam.html, máy chủ riêng) — ở đây chỉ có đường sang + con số. `can: 'dang_nhap'` = ai đã
  // đăng nhập cũng thấy, không kể phòng.
  { id: 'hop_tb', ten: 'Thông báo', bt: '🔔', ghi: 'Tin của công ty, của phòng và việc đang chờ bạn. Cần đăng nhập.', viec: [
    { id: 'hop_thong_bao', ten: 'Thông báo của tôi', bt: '🔔', mt: 'Tin gửi cho bạn · việc cần làm hôm nay', cu: 'trungtam.html', can: 'dang_nhap' }] },
  { id: 'van_hanh', ten: 'Vận hành', bt: '🛠️', ghi: 'Không cần đăng nhập. Đăng ký = ghi người <b>sẽ</b> đến nhà máy (chụp thẻ là '
    + 'tự điền). Quét thẻ đón = ở cổng nhà máy, đánh dấu người <b>đã</b> đến.', viec: [
    { id: 'dang_ky', ten: 'Đăng ký lao động', bt: '📝', mt: 'Ghi người sẽ đến nhà máy', cu: 'index.html' },
    { id: 'quet_the_don', ten: 'Quét thẻ đón', bt: '📷', mt: 'Đánh dấu người đã đến', cu: 'doncong.html' },
    { id: 'danh_sach_goi', ten: 'Danh sách gọi', bt: '📞', mt: 'Gọi lao động · báo vào làm · lấy dữ liệu', cu: 'danhsach.html', can: 'van_hanh' },
    { id: 'phan_cong_don', ten: 'Phân công đón', bt: '👥', mt: 'Ai phụ trách nhà máy nào', cu: 'phancong.html', can: 'phan_cong' },
    { id: 'bao_quan_so', ten: 'Báo quân số', bt: '📊', mt: 'Số người đi làm từng công ty', cu: 'quanso.html', can: 'van_hanh' },
    { id: 'du_lieu_tuyen', ten: 'Dữ liệu tuyển', bt: '📁', mt: 'Người mình đã tuyển · đăng ký lại', cu: 'dulieutuyen.html', can: 'du_lieu_tuyen' },
    { id: 'nhap_bu', ten: 'Nhập bù', bt: '➕', mt: 'Người đã đi làm mà chưa đăng ký', cu: 'nhapbu.html', can: 'du_lieu_tuyen' },
    { id: 'gio_lam', ten: 'Giờ làm người tôi tuyển', bt: '⏱', mt: 'Giờ từng tháng theo file kế toán', cu: 'giotien.html', can: 'du_lieu_tuyen' },
    { id: 'ho_so_scan', ten: 'Hồ sơ scan', bt: '🗂️', mt: 'Bản scan căn cước tự xếp thư mục (máy tính)', cu: 'hososcan.html', can: 'van_hanh' }] },
  { id: 'ke_toan', ten: 'Kế toán', bt: '💰', ghi: 'Chỉ dành cho kế toán: bảng giá, file giờ. Đăng nhập riêng bằng tài khoản '
    + 'công–lương, không dùng mật khẩu tuyển dụng.', viec: [
    { id: 'cong_luong', ten: 'Hệ công–lương', bt: '📒', mt: 'Bảng giá · file giờ — đăng nhập riêng', cu: 'noibo.html' }] },
  { id: 'bao_cao', ten: 'Báo cáo', bt: '📈', ghi: 'Số liệu tuyển dụng — trưởng nhóm và quản trị.', viec: [
    { id: 'bieu_do', ten: 'Biểu đồ tuyển dụng', bt: '📈', mt: 'Biến động tuyển dụng · quân số · nhân viên', cu: 'bieudo.html', can: 'phan_cong' }] },
  // 3.65 (vé 05): chỉ quản trị. Mục nằm trong khung trang chủ (không có `cu`).
  { id: 'quan_tri', ten: 'Quản trị', bt: '⚙️', ghi: 'Chỉ quản trị. Xem để soát — sửa vẫn ở Sheet.', viec: [
    { id: 'tai_khoan_quyen', ten: 'Tài khoản & quyền', bt: '🛡️', mt: 'Ai đăng nhập được · phòng · chức vụ — chỉ xem', can: 'quan_tri' }] }
];
var VP_KHOA_VE = 'phien_ds_v3';   // CHUNG vé với trang chủ + các trang có đăng nhập

var vpMoDm = '';                  // đầu mục đang thả xuống ('' = không)
var vpMenuDaVe = null;            // HTML menu lần trước — giống thì không vẽ lại (menu đang mở không bị đóng)

function vpEl_(id) { return document.getElementById(id); }
function vpThoat_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function vpCoVe_() { try { return !!localStorage.getItem(VP_KHOA_VE); } catch (e) { return false; } }
function vpLop_(el, lop, bat) { el.classList[bat ? 'add' : 'remove'](lop); }
function vpTimViec_(id) {
  for (var i = 0; i < VP_MENU.length; i++) {
    for (var j = 0; j < VP_MENU[i].viec.length; j++) if (VP_MENU[i].viec[j].id === id) return { dm: VP_MENU[i], v: VP_MENU[i].viec[j] };
  }
  return null;
}

/** Tài khoản đang đăng nhập: gói đầu của vé này (goi-dau.js), chưa có gói thì tài khoản mã cũ trang chủ vừa nhận lúc đăng nhập
 *  (tkTam). null = chưa biết quyền (máy chủ chưa trả lời, hoặc trang không nạp goi-dau.js). */
function vpTK_() {
  try {
    var v = typeof layGoi_ === 'function' ? layGoi_(localStorage.getItem(VP_KHOA_VE) || '') : null;
    if (v && v.goi && v.goi.tai_khoan) return { tk: v.goi.tai_khoan, xemDlt: v.goi.xem_du_lieu_tuyen };
  } catch (e) {}
  return { tk: (typeof tkTam !== 'undefined' && tkTam) || null, xemDlt: undefined };
}
/** Việc này có hiện cho người đang xem không. Chưa biết quyền → hiện (trang tự kiểm), như trang chủ cũ.
 *  Máy chủ cũ không gửi `phong` → coi là Vận hành; phòng gõ lạ ('') → chỉ việc công khai. */
function vpThayViec_(v, coVe, q) {
  if (!v.can) return true;
  if (!coVe) return false;
  var tk = q.tk;
  // 3.66 — hộp thông báo: mọi phòng của công ty. KHÔNG hiện cho đối tác (hộp chưa nhận tài khoản không có CCCD) và phòng gõ lạ
  // (chỉ thấy mục công khai, như luật 3.64). Chưa biết quyền → hiện, trang hộp tự kiểm.
  if (v.can === 'dang_nhap') return !tk || (tk.phong !== 'doi_tac' && tk.phong !== '');
  if (v.can === 'quan_tri') return !!(tk && tk.la_quan_tri);   // 3.65 — chưa rõ quyền thì CHƯA hiện (như ô Kế toán của trang chủ)
  if (!tk) return true;
  var vanHanh = !!tk.la_quan_tri || tk.phong === undefined || tk.phong === 'van_hanh';
  if (!vanHanh) return false;
  if (v.can === 'phan_cong') return !!tk.phan_cong_duoc;
  if (v.can === 'du_lieu_tuyen') return q.xemDlt !== false;
  return v.can === 'van_hanh';
}
/* ---------- 3.66 — con số của ô 🔔 Thông báo của tôi: hỏi THẲNG máy chủ hộp thông báo (cú tb_dem), không qua máy chủ tuyển dụng ----------
 * Địa chỉ ở tệp trungtam-cau-hinh.js (biến URL_TRUNG_TAM, của hệ thông báo). Thiếu tệp / chưa khai / hộp lỗi / hết phiên → ô vẫn bấm
 * được, chỉ KHÔNG có số (trang hộp sẽ nói rõ khi mở). Số nhớ 2 phút trong máy theo vé, để mở lại trang chủ không hỏi lại. */
var VP_NHO_DEM_TB = 'vp_dem_tb_v1', VP_TUOI_DEM_TB = 2 * 60000;
var VP_CHO_LOI_TB = 60000;        // 3.66.1: hỏi hỏng thì 1 phút sau mới hỏi lại — thanh vẽ lại sau mỗi lần đổi mục / mỗi cú bấm
var vpDemTB = null;               // { gap, hom_nay, chua_doc }; null = chưa có số
var vpDemTBVe = '';               // dấu của vé mà vpDemTB thuộc về — đổi người ngay trên trang thì số cũ không còn dùng
var vpDangDemTB = false;
var vpChoDemTB = [];              // 3.66.1: các nơi chờ số của CÙNG một lượt hỏi (ô 🔔 trang chủ + chuông góc phải)
var vpLoiDemTBLuc = 0;            // lúc hỏi hỏng gần nhất
function vpDauVe_() { var s = '', h = 5381; try { s = localStorage.getItem(VP_KHOA_VE) || ''; } catch (e) {} for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36) + '.' + s.length; }
/** Số của ĐÚNG người đang đăng nhập; null khi chưa có. */
function vpDemCuaVe_() { return vpDemTB && vpDemTBVe === vpDauVe_() ? vpDemTB : null; }
/** Chữ dưới ô: '' khi chưa có số. */
function vpChuDemTB_() {
  var d = vpDemCuaVe_();
  if (!d) return '';
  if (!d.gap && !d.hom_nay) return d.chua_doc ? d.chua_doc + ' tin chưa đọc' : 'Không có việc cần làm';
  return (d.gap ? '🔴 ' + d.gap + ' gấp' : '') + (d.gap && d.hom_nay ? ' · ' : '') + (d.hom_nay ? '📌 ' + d.hom_nay + ' hôm nay' : '');
}
/** Lấy số (nhiều nhất 2 phút một lần cho mỗi vé). `xong` gọi khi có số mới để nơi gọi vẽ lại. Đang hỏi dở thì `xong` chờ chung lượt đó. */
function vpLayDemTB_(xong) {
  if (!vpCoVe_() || typeof URL_TRUNG_TAM === 'undefined' || !URL_TRUNG_TAM || typeof fetch !== 'function') return;
  if (vpDangDemTB) { if (xong && vpChoDemTB.indexOf(xong) < 0) vpChoDemTB.push(xong); return; }
  var dau = vpDauVe_();
  try {
    var nho = JSON.parse(localStorage.getItem(VP_NHO_DEM_TB) || 'null');
    if (nho && nho.chu === dau && Date.now() - nho.luc < VP_TUOI_DEM_TB) {
      if (!vpDemCuaVe_()) { vpDemTB = nho.dem; vpDemTBVe = dau; if (xong) xong(); }
      return;
    }
  } catch (e) {}
  if (Date.now() - vpLoiDemTBLuc < VP_CHO_LOI_TB) return;
  vpDangDemTB = true;
  vpChoDemTB = xong ? [xong] : [];
  var phien = ''; try { phien = localStorage.getItem(VP_KHOA_VE) || ''; } catch (e) {}
  fetch(URL_TRUNG_TAM, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ hanh_dong: 'tb_dem', phien: phien }) })
    .then(function (r) { return r.json(); })
    .then(function (kq) {
      var cho = vpChoDemTB;
      vpDangDemTB = false; vpChoDemTB = [];
      if (dau !== vpDauVe_()) return;                                      // đã đổi người trong lúc chờ → bỏ
      if (!kq || !kq.ok || !kq.dem) { vpLoiDemTBLuc = Date.now(); return; }
      vpDemTB = { gap: +kq.dem.gap || 0, hom_nay: +kq.dem.hom_nay || 0, chua_doc: +kq.dem.chua_doc || 0 };
      vpDemTBVe = dau;
      try { localStorage.setItem(VP_NHO_DEM_TB, JSON.stringify({ chu: dau, luc: Date.now(), dem: vpDemTB })); } catch (e) {}
      cho.forEach(function (f) { f(); });
    })
    .catch(function () { vpDangDemTB = false; vpChoDemTB = []; vpLoiDemTBLuc = Date.now(); });
}
/** Sang hộp (bấm chuông / ô 🔔): quên số cũ, để lúc quay lại trang hỏi số mới — đọc tin xong thì số giảm ngay, không chờ 2 phút. */
function vpQuenDemTB_() {
  vpDemTB = null; vpLoiDemTBLuc = 0;
  try { localStorage.removeItem(VP_NHO_DEM_TB); } catch (e) {}
}

/* ---------- 3.66.1 — CHUÔNG 🔔 Ở GÓC PHẢI THANH (Dương 11/11/2026: "hiện số thông báo lên con số màu đỏ để người dùng biết vào xem,
 * chứ không phải chọn mới thấy") ----------
 * Số đỏ = số tin CHƯA ĐỌC (chua_doc của tb_dem); 0 thì không có số; quá 99 ghi "99+". Bấm = mở thẳng trungtam.html.
 * Chỉ hiện khi đã đăng nhập, người này được dùng hộp (cùng luật ô "Thông báo của tôi") VÀ trang biết địa chỉ hộp
 * (trungtam-cau-hinh.js — hiện chỉ trang chủ nạp). Không hỏi được hộp thì không bày chuông: chuông không số dễ bị hiểu là "không có tin".
 * Hộp lỗi / hết phiên → chuông vẫn hiện, không số (như ô ở trang chủ). */
function vpVeChuong_() {
  var ch = vpEl_('vp_chuong');
  if (!ch) return;                                                       // trang cũ chưa có chỗ cho chuông
  var co = vpCoVe_() && typeof URL_TRUNG_TAM !== 'undefined' && !!URL_TRUNG_TAM &&
           vpThayViec_(vpTimViec_('hop_thong_bao').v, true, vpTK_());
  ch.hidden = !co;
  if (!co) return;
  var d = vpDemCuaVe_(), n = d ? d.chua_doc : 0;
  var html = '<span aria-hidden="true">🔔</span><span class="vp-chuong-chu">Thông báo</span>' +
             (n > 0 ? '<span class="vp-so">' + (n > 99 ? '99+' : n) + '</span>' : '');
  if (ch.innerHTML !== html) ch.innerHTML = html;
  var nhan = n > 0 ? 'Thông báo: ' + n + ' tin chưa đọc' : 'Thông báo';
  ch.setAttribute('aria-label', nhan);
  ch.setAttribute('title', nhan);
  vpLayDemTB_(vpVeChuong_);
}

/** Các đầu mục kèm đúng những việc người này thấy; đầu mục rỗng bỏ đi. */
function vpMenuCuaToi_() {
  var coVe = vpCoVe_(), q = vpTK_();
  return VP_MENU.map(function (d) {
    return { d: d, viec: d.viec.filter(function (v) { return vpThayViec_(v, coVe, q); }) };
  }).filter(function (x) { return x.viec.length; });
}

/** Trang này là khung (trang chủ, có vùng dữ liệu #vp_trang) hay trang riêng. Đường tới trang chủ: khung '' (chỉ đổi #) · trang riêng
 *  'trangchu.html'. */
function vpLaKhung_() { return !!vpEl_('vp_trang'); }
function vpVeChu_() { return vpLaKhung_() ? '' : 'trangchu.html'; }

// Mục đang mở. Khung: vanphong.js đặt lại theo địa chỉ. Trang riêng: việc có `cu` trùng tên tệp đang mở.
var vpMuc = (function () {
  var tep = String((typeof location !== 'undefined' && location.pathname) || '').split('/').pop();
  for (var i = 0; i < VP_MENU.length; i++) {
    for (var j = 0; j < VP_MENU[i].viec.length; j++) if (tep && VP_MENU[i].viec[j].cu === tep) return VP_MENU[i].viec[j].id;
  }
  return 'trang_chu';
})();

function vpHtmlViec_(v) {
  return '<a class="vp-viec' + (v.id === vpMuc ? ' vp-dang' : '') + '" href="' + (v.cu || vpVeChu_() + '#' + v.id.replace(/_/g, '-')) + '">' +
    '<span class="vp-bt" aria-hidden="true">' + v.bt + '</span><span><b>' + vpThoat_(v.ten) + '</b>' +
    '<span class="vp-mt">' + vpThoat_(v.mt) + '</span></span></a>';
}
function vpVeThanh_() {
  var html = vpMenuCuaToi_().map(function (x) {
    var d = x.d;
    var dang = x.viec.some(function (v) { return v.id === vpMuc; });
    var mo = vpMoDm === d.id;
    return '<div class="vp-dm' + (dang ? ' vp-dang' : '') + (mo ? ' vp-mo' : '') + '" data-dm="' + d.id + '">' +
      '<button type="button" aria-expanded="' + mo + '"><span aria-hidden="true">' + d.bt + '</span>' + vpThoat_(d.ten) +
      ' <span class="vp-mui" aria-hidden="true">▾</span></button>' +
      '<div class="vp-tha">' + x.viec.map(vpHtmlViec_).join('') + '</div></div>';
  }).join('');
  if (html !== vpMenuDaVe) { vpEl_('vp_menu').innerHTML = html; vpMenuDaVe = html; }
  // Nút góc phải: chưa đăng nhập → 🔐 Đăng nhập · đã đăng nhập → 👤 <tên> mở mục Tài khoản ở trang chủ (Đăng xuất ở đó)
  var tk = vpEl_('vp_tk'), q = vpCoVe_() ? vpTK_() : null;
  var chu = q ? '👤 ' + ((q.tk && q.tk.ten_nguoi) || 'Tài khoản') : '🔐 Đăng nhập';
  if (tk.textContent !== chu) tk.textContent = chu;
  tk.setAttribute('href', vpVeChu_() + (q ? '#tai-khoan' : '#dang-nhap'));
  vpLop_(tk, 'vp-dang', vpMuc === 'tai_khoan');
  vpVeChuong_();
}

/** Trang riêng: chèn thanh lên đầu <body> (cùng khuôn với trangchu.html). Trả true nếu vừa chèn (= đang ở trang riêng). */
function vpGanThanh_() {
  if (vpEl_('vp_thanh')) return false;
  document.body.insertAdjacentHTML('afterbegin', '<header class="vp-thanh" id="vp_thanh"><div class="vp-thanh-trong">' +
    '<a class="vp-ve" id="vp_ve" href="trangchu.html">◀ Trang chủ</a>' +
    '<a class="vp-logo" href="trangchu.html" title="Về trang chủ"><span class="vp-cham" aria-hidden="true">MĐ</span>' +
    '<span>VĂN PHÒNG<small>Cung ứng lao động Minh Đức</small></span></a>' +
    '<nav class="vp-menu" id="vp_menu" aria-label="Các phòng"></nav>' +
    '<a class="vp-chuong" id="vp_chuong" href="trungtam.html" hidden aria-label="Thông báo"><span aria-hidden="true">🔔</span></a>' +
    '<a class="vp-tk" id="vp_tk" href="trangchu.html#dang-nhap">🔐 Đăng nhập</a></div></header>');
  // vp-trong-viec: điện thoại hiện "◀ Trang chủ" thay logo · vp-trang-cu: thanh không dính đỉnh · vp-co-thanh: ẩn nút về trang chủ cũ
  ['vp-co-thanh', 'vp-trong-viec', 'vp-trang-cu'].forEach(function (c) { document.body.classList.add(c); });
  return true;
}

// ---------------- Bấm ----------------
var vpTrangRieng = vpGanThanh_();
vpEl_('vp_menu').addEventListener('click', function (e) {
  var t = e.target;
  if (t.closest && t.closest('a')) {                         // chọn một việc: menu thu lại (vẽ sau, để link kịp mở)
    vpMoDm = '';
    setTimeout(vpVeThanh_, 0);
    return;
  }
  var dm = t.closest ? t.closest('[data-dm]') : null;
  if (!dm) return;
  // Menu vẽ lại ngay dưới đây nên nút vừa bấm rời khỏi trang: để cú bấm lan lên document thì nó tưởng "bấm ra ngoài" và
  // đóng luôn menu vừa mở (thấy tận mắt 05/11/2026).
  if (e.stopPropagation) e.stopPropagation();
  var id = dm.getAttribute('data-dm');
  vpMoDm = vpMoDm === id ? '' : id;                          // mỗi lúc một đầu mục mở
  vpVeThanh_();
});
document.addEventListener('click', function (e) {
  if (e.target && e.target.closest && e.target.closest('a[href="trungtam.html"]')) vpQuenDemTB_();   // 3.66.1: sang hộp
  if (vpMoDm &&!(e.target && e.target.closest && e.target.closest('#vp_menu'))) { vpMoDm = ''; vpVeThanh_(); }
  // Trang riêng tự đăng nhập / đăng xuất (mã của trang) → nút góc phải + menu đổi theo sau cú bấm đó
  else if (vpTrangRieng) setTimeout(vpVeThanh_, 0);
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && vpMoDm) { vpMoDm = ''; vpVeThanh_(); }
});
if (vpTrangRieng) {
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') vpVeThanh_(); });
  vpVeThanh_();
}
