/* ============================================================
 * KHUÔN BẢNG CHUNG (bản 3.65, vé 04 khung Văn phòng) — ô lọc + Tìm, dòng Tổng ở trên, bấm tiêu đề để xếp, ☰ Thêm cột,
 * 📋 Chép dán Excel, ⬇ Tải file Excel. Màn hẹp ≤ 860 px bày thẻ. Đặc tả: .scratch/van-phong/DAC-TA.md (mục 0.9, 0.15).
 * ============================================================
 * Dùng:  moBang_(phầnTửChứa, {
 *          id, tep,                         // id: khoá trạng thái (lọc, cột ẩn, xếp) · tep: tên tệp tải về "<tep>-yyyy-mm-dd.csv"
 *          cot: [{ k, ten, md, so, ve, chu, khong_xuat }],
 *                                           // md: hiện sẵn (false = ẩn, mở bằng ☰) · so: cột số (Excel cộng được, xếp theo số)
 *                                           // ve(r): HTML ô (link…) · chu(r): chữ xuất Excel · khong_xuat: cột nút, không ra tệp
 *          dong: [...], loc: [{ k, ten, ds, khop(r, v), tat }], tim: [k…], tong(ds) → HTML,
 *          the_tieu_de, the_nhan, rong: 'câu khi chưa có dòng nào' })
 *
 * Hàm THUẦN (kiểm bằng Node, kiem/bangchung.test.mjs): bcLocDong_, bcXepDong_, bcBangXuat_, bcDungCsv_, bcDungChep_, bcTenTep_.
 *
 * TỆP TẢI VỀ: UTF-16 có BOM, ngăn cột bằng Tab, đuôi .csv — Excel mở đúng cột ở MỌI máy. Tệp UTF-8 ngăn bằng dấu phẩy chỉ đúng
 * ở máy để vùng Mỹ: máy để vùng Việt Nam ngăn cột bằng dấu chấm phẩy → cả bảng dồn vào cột A (hỏng lặng lẽ). Ô trông như số / ngày
 * (CCCD, SĐT, dd/mm/yyyy) ghi ="…" để Excel giữ NGUYÊN chữ: không mất số 0 đầu, CCCD không thành 1,24E+11, 05/11 không thành 11/05.
 * CHÉP: cùng cách trang Danh sách (danhsach.html) — HTML mọi ô mso-number-format:"\@" + chữ thuần, ba lớp dự phòng.
 */
var BC_TT = {};   // id → { an: {k: true}, loc: {k: v}, tim, xep, chieu, moCot }
var BC_O = {};    // id → cấu hình đang bày

function bcThoat_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Dải dấu thanh (U+0300–U+036F) dựng bằng mã số — dán thẳng ký tự tổ hợp vào mã rất dễ bị một lần lưu khác bảng mã làm hỏng lặng lẽ
var BC_DAU_ = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
/** Bỏ dấu + chữ thường để lọc / tìm / xếp: "Đặng" ~ "dang". */
function bcBoDau_(s) {
  var t = String(s == null ? '' : s);
  if (t.normalize) t = t.normalize('NFD').replace(BC_DAU_, '');
  return t.replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}
/** Chữ của một ô (để tìm, xếp, chép, tải). */
function bcGiaTri_(c, r) {
  var v = c.chu ? c.chu(r) : r[c.k];
  return v == null ? '' : String(v);
}
function bcTrangThai_(o) {
  var st = BC_TT[o.id];
  if (!st) {
    st = BC_TT[o.id] = { an: {}, loc: {}, tim: '', xep: '', chieu: 1, moCot: false };
    o.cot.forEach(function (c) { if (c.md === false) st.an[c.k] = true; });
  }
  return st;
}

// ---------------- Hàm thuần ----------------
/** Dòng khớp mọi ô lọc đang chọn + ô Tìm (không phân biệt dấu, hoa thường). */
function bcLocDong_(o, st) {
  var t = bcBoDau_(String(st.tim || '').trim());
  return (o.dong || []).filter(function (r) {
    var hopLoc = (o.loc || []).every(function (l) { return !st.loc[l.k] || l.khop(r, st.loc[l.k]); });
    if (!hopLoc) return false;
    if (!t) return true;
    return (o.tim || []).some(function (k) {
      var c = null;
      for (var i = 0; i < o.cot.length; i++) if (o.cot[i].k === k) c = o.cot[i];
      return bcBoDau_(c ? bcGiaTri_(c, r) : r[k]).indexOf(t) >= 0;
    });
  });
}
/** Khoá xếp: cột số theo số; dd/mm/yyyy theo ngày; còn lại theo chữ đã bỏ dấu. */
function bcKhoaXep_(c, r) {
  var v = bcGiaTri_(c, r);
  if (c.so) return Number(v) || 0;
  var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
  if (m) return m[3] + (m[2].length < 2 ? '0' : '') + m[2] + (m[1].length < 2 ? '0' : '') + m[1];
  return bcBoDau_(v);
}
/** Bản đã xếp (không đụng mảng gốc). Cùng khoá giữ thứ tự cũ. chieu: 1 tăng, -1 giảm. */
function bcXepDong_(ds, c, chieu) {
  if (!c) return ds.slice();
  return ds.map(function (r, i) { return { r: r, i: i, k: bcKhoaXep_(c, r) }; }).sort(function (a, b) {
    return (a.k > b.k ? 1 : a.k < b.k ? -1 : 0) * (chieu < 0 ? -1 : 1) || a.i - b.i;
  }).map(function (x) { return x.r; });
}
function bcCotHien_(o, st) { return o.cot.filter(function (c) { return !st.an[c.k]; }); }
function bcDongDangXem_(o, st) {
  var c = null;
  for (var i = 0; i < o.cot.length; i++) if (o.cot[i].k === st.xep) c = o.cot[i];
  return bcXepDong_(bcLocDong_(o, st), c, st.chieu);
}
/** Đúng phần đang thấy: dòng đang lọc + xếp, cột đang hiện, bỏ cột nút. → { cot: [c…], ds: [[chữ…]…] } */
function bcBangXuat_(o, st) {
  var cot = bcCotHien_(o, st).filter(function (c) { return !c.khong_xuat; });
  return { cot: cot, ds: bcDongDangXem_(o, st).map(function (r) { return cot.map(function (c) { return bcGiaTri_(c, r); }); }) };
}
/** Một ô của tệp tải về. */
function bcOCsv_(v, c) {
  v = v == null ? '' : String(v);
  if (c && c.so && /^-?\d+(\.\d+)?$/.test(v)) return v;                        // cột số: để Excel cộng được
  if (/\d/.test(v) && /^[\d\s.,:\/+\-]+$/.test(v)) return '="' + v + '"';       // trông như số / ngày → giữ nguyên chữ
  if (v.length > 1 && /^[=+\-@]/.test(v)) v = "'" + v;                         // chữ người gõ bắt đầu như công thức → không cho chạy
  if (/[\t\r\n"]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}
/** Nội dung tệp (chuỗi, CHƯA có BOM): dòng tiêu đề + dữ liệu, ngăn Tab, xuống dòng CRLF. */
function bcDungCsv_(cot, ds) {
  return [cot.map(function (c) { return bcOCsv_(c.ten); })].concat(ds.map(function (d) {
    return d.map(function (v, i) { return bcOCsv_(v, cot[i]); });
  })).map(function (h) { return h.join('\t'); }).join('\r\n');
}
/** Chuỗi → byte UTF-16LE, có BOM FF FE ở đầu (Excel nhận ra là chữ Unicode ngăn bằng Tab). */
function bcMaHoa_(s) {
  var b = new Uint8Array(2 + s.length * 2);
  b[0] = 0xFF; b[1] = 0xFE;
  for (var i = 0; i < s.length; i++) { var n = s.charCodeAt(i); b[2 + i * 2] = n & 0xFF; b[3 + i * 2] = n >> 8; }
  return b;
}
/** Hai dạng để chép: HTML (Excel giữ đúng chữ — cột số thì để Excel tự nhận số) + chữ thuần ngăn Tab (dán vào Zalo, Notepad). */
function bcDungChep_(cot, ds) {
  var oChu = 'mso-number-format:"\\@";';
  var kieu = function (c) { return c && c.so ? '' : ' style=\'' + oChu + '\''; };
  var html = '<table><tr>' + cot.map(function (c) { return '<th' + kieu() + '>' + bcThoat_(c.ten) + '</th>'; }).join('') + '</tr>' +
    ds.map(function (d) {
      return '<tr>' + d.map(function (v, i) { return '<td' + kieu(cot[i]) + '>' + bcThoat_(v) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</table>';
  var phang = function (v) { return String(v == null ? '' : v).replace(/[\t\r\n]+/g, ' '); };
  var text = [cot.map(function (c) { return phang(c.ten); })].concat(ds.map(function (d) { return d.map(phang); }))
    .map(function (h) { return h.join('\t'); }).join('\n');
  return { html: html, text: text };
}
/** "<tep>-yyyy-mm-dd.csv" theo ngày máy. */
function bcTenTep_(tep, d) {
  d = d || new Date();
  var hai = function (x) { return (x < 10 ? '0' : '') + x; };
  return (tep || 'bang') + '-' + d.getFullYear() + '-' + hai(d.getMonth() + 1) + '-' + hai(d.getDate()) + '.csv';
}

// ---------------- Bày ra trang ----------------
var BC_THE_TOI_DA = 80;
var BC_DAI = 40;   // ô bảng trên chừng này ký tự thì được xuống dòng; ngắn hơn (CCCD, SĐT, ngày) giữ một dòng
function bcHep_() {
  try { return !!(window.matchMedia && window.matchMedia('(max-width: 860px)').matches); } catch (e) { return false; }
}
function bcEl_(id) { return document.getElementById(id); }

function moBang_(vung, o) {
  if (!vung) return;
  BC_O[o.id] = o;
  var st = bcTrangThai_(o), id = o.id;
  vung.innerHTML =
    ((o.loc && o.loc.length) || (o.tim && o.tim.length) ? '<div class="bc-cong-cu">' + (o.loc || []).map(function (l) {
      return '<div class="bc-loc"><label for="bc_loc_' + id + '_' + l.k + '">' + bcThoat_(l.ten) + '</label><select id="bc_loc_' + id + '_' +
        l.k + '" data-bc-loc="' + l.k + '"><option value="">' + bcThoat_(l.tat || 'Tất cả') + '</option>' + l.ds.map(function (x) {
          var g = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x;
          return '<option value="' + bcThoat_(g) + '"' + (st.loc[l.k] === g ? ' selected' : '') + '>' + bcThoat_(t) + '</option>';
        }).join('') + '</select></div>';
    }).join('') + (o.tim && o.tim.length ? '<div class="bc-loc bc-tim"><label for="bc_tim_' + id + '">🔍 Tìm</label><input id="bc_tim_' + id +
      '" type="search" data-bc-tim="1" placeholder="Gõ vài chữ, không cần dấu" value="' + bcThoat_(st.tim) + '"></div>' : '') + '</div>' : '') +
    '<div class="bc-tong"><span class="bc-tong-so" id="bc_tong_' + id + '"></span><span class="bc-nut-bang">' +
    '<button type="button" class="bc-nut" data-bc="cot" aria-expanded="' + (st.moCot ? 'true' : 'false') + '">☰ Thêm cột</button>' +
    '<button type="button" class="bc-nut" data-bc="chep">📋 Chép dán Excel</button>' +
    '<button type="button" class="bc-nut bc-chinh" data-bc="tai">⬇ Tải file Excel</button></span></div>' +
    '<div class="bc-chon-cot' + (st.moCot ? '' : ' an') + '" id="bc_cot_' + id + '"><div class="bc-ghi">👉 Tích cột muốn xem. Chép / tải Excel ra '
    + 'đúng các cột đang tích, đúng các dòng đang lọc.</div><div class="bc-ds-cot">' + o.cot.map(function (c) {
      return '<label><input type="checkbox" data-bc-cot="' + c.k + '"' + (st.an[c.k] ? '' : ' checked') + '> ' + bcThoat_(c.ten) + '</label>';
    }).join('') + '</div></div>' +
    '<div class="bc-bao an" id="bc_bao_' + id + '" role="status"></div><div id="bc_kq_' + id + '"></div>';

  vung.addEventListener('click', function (e) {
    var n = e.target && e.target.closest ? e.target.closest('[data-bc],[data-bc-xep]') : null;
    if (!n) return;
    var xep = n.getAttribute('data-bc-xep');
    if (xep) { if (st.xep === xep) st.chieu = -st.chieu; else { st.xep = xep; st.chieu = 1; } bcVeKq_(id); return; }
    var viec = n.getAttribute('data-bc');
    if (viec === 'cot') {
      st.moCot = !st.moCot;
      var p = bcEl_('bc_cot_' + id);
      if (p) p.classList[st.moCot ? 'remove' : 'add']('an');
      n.setAttribute('aria-expanded', st.moCot ? 'true' : 'false');
    } else if (viec === 'chep') bcChep_(id);
    else if (viec === 'tai') bcTai_(id);
  });
  vung.addEventListener('change', function (e) {
    var t = e.target || {}, l = t.getAttribute && t.getAttribute('data-bc-loc'), c = t.getAttribute && t.getAttribute('data-bc-cot');
    if (l) { st.loc[l] = t.value; bcVeKq_(id); }
    else if (c) { if (t.checked) delete st.an[c]; else st.an[c] = true; bcVeKq_(id); }
  });
  vung.addEventListener('input', function (e) {
    var t = e.target || {};
    if (t.getAttribute && t.getAttribute('data-bc-tim')) { st.tim = t.value || ''; bcVeKq_(id); }
  });
  bcVeKq_(id);
}

function bcOHtml_(c, r) { return c.ve ? c.ve(r) : bcThoat_(bcGiaTri_(c, r)); }

function bcVeKq_(id) {
  var o = BC_O[id], st = BC_TT[id], kq = bcEl_('bc_kq_' + id), tong = bcEl_('bc_tong_' + id);
  if (!o || !kq) return;
  var ds = bcDongDangXem_(o, st), cot = bcCotHien_(o, st);
  // "(trong N — đang lọc)" luôn có khi đang lọc, kể cả trang tự viết dòng Tổng — người xem biết số này chưa phải cả bảng
  if (tong) tong.innerHTML = (o.tong ? o.tong(ds) : 'Tổng: <b>' + ds.length + '</b> dòng') + (ds.length < (o.dong || []).length
    ? ' <span class="bc-mo">(trong ' + o.dong.length + ' — đang lọc)</span>' : '');
  if (!(o.dong || []).length) { kq.innerHTML = '<div class="bc-rong">' + (o.rong || 'Chưa có dòng nào.') + '</div>'; return; }
  if (!ds.length) { kq.innerHTML = '<div class="bc-rong">Không có dòng nào khớp. 👉 Chọn "Tất cả" ở ô lọc hoặc xoá chữ trong ô Tìm.</div>'; return; }
  if (!cot.length) { kq.innerHTML = '<div class="bc-rong">Chưa tích cột nào. 👉 Bấm ☰ Thêm cột rồi tích cột muốn xem.</div>'; return; }
  if (bcHep_()) {
    var tieu = null, nhan = null;
    cot.forEach(function (c) { if (c.k === o.the_tieu_de) tieu = c; if (c.k === o.the_nhan) nhan = c; });
    tieu = tieu || cot[0];
    kq.innerHTML = '<div class="bc-ds-the">' + ds.slice(0, BC_THE_TOI_DA).map(function (r) {
      return '<div class="bc-the"><div class="bc-the-dau"><b>' + bcOHtml_(tieu, r) + '</b>' + (nhan && nhan !== tieu ? bcOHtml_(nhan, r) : '') +
        // Thẻ bỏ dòng không có chữ (CCCD của đối tác, "Khoá" khi không khoá…) — thẻ ngắn, đọc nhanh trên điện thoại
        '</div><dl>' + cot.filter(function (c) { return c !== tieu && c !== nhan && (c.ve || bcGiaTri_(c, r) !== ''); }).map(function (c) {
          return '<dt>' + bcThoat_(c.ten) + '</dt><dd>' + bcOHtml_(c, r) + '</dd>';
        }).join('') + '</dl></div>';
    }).join('') + '</div>' + (ds.length > BC_THE_TOI_DA ? '<div class="bc-rong">Đang hiện ' + BC_THE_TOI_DA + ' / ' + ds.length +
      ' dòng — gõ ô Tìm để thu hẹp. Chép / tải Excel vẫn ra đủ ' + ds.length + ' dòng.</div>' : '');
    return;
  }
  kq.innerHTML = '<div class="bc-khung"><table class="bc-bang"><thead><tr><th class="bc-stt">#</th>' + cot.map(function (c) {
    var dau = st.xep === c.k ? (st.chieu > 0 ? ' ▲' : ' ▼') : '';
    return '<th class="' + (c.so ? 'bc-so' : '') + '"><button type="button" class="bc-xep" data-bc-xep="' + c.k + '" title="Bấm để xếp">' +
      bcThoat_(c.ten) + '<span class="bc-dau">' + dau + '</span></button></th>';
  }).join('') + '</tr></thead><tbody>' + ds.map(function (r, i) {
    return '<tr><td class="bc-stt">' + (i + 1) + '</td>' + cot.map(function (c) {
      var lop = c.so ? 'bc-so' : (bcGiaTri_(c, r).length > BC_DAI ? 'bc-dai' : '');   // chữ dài mới được xuống dòng (vanphong.css)
      return '<td class="' + lop + '">' + bcOHtml_(c, r) + '</td>';
    }).join('') + '</tr>';
  }).join('') + '</tbody></table></div>';
}

function bcBao_(id, cau) {
  var b = bcEl_('bc_bao_' + id);
  if (!b) return;
  b.innerHTML = cau || '';
  b.classList[cau ? 'remove' : 'add']('an');
}

/** 📋 Chép — ba lớp như trang Danh sách, không được im lặng không làm gì (Zalo hay chặn bảng nháy). */
function bcChep_(id) {
  var o = BC_O[id], x = bcBangXuat_(o, BC_TT[id]);
  if (!x.ds.length) { bcBao_(id, '⚠️ Không có dòng nào để chép — bỏ bớt ô lọc trước đã.'); return; }
  var c = bcDungChep_(x.cot, x.ds);
  var xong = function () { bcBao_(id, '✅ Đã chép ' + x.ds.length + ' dòng × ' + x.cot.length + ' cột — mở Excel, bấm Ctrl + V.'); };
  var tuChep = function () {
    bcBao_(id, '⚠️ Trình duyệt này không cho tự chép. 👉 Bấm giữ vùng chữ dưới đây → Chọn tất cả → Sao chép, rồi dán vào Excel.' +
      '<textarea class="bc-chep-tay" readonly rows="6" id="bc_tay_' + id + '">' + bcThoat_(c.text) + '</textarea>');
    var t = bcEl_('bc_tay_' + id);
    if (t && t.select) { try { t.focus(); t.select(); } catch (e) {} }
  };
  try {
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([c.html], { type: 'text/html' }),
                                                     'text/plain': new Blob([c.text], { type: 'text/plain' }) })])
        .then(xong, function () { if (bcChepGiau_(c.html, c.text)) xong(); else tuChep(); });
      return;
    }
  } catch (e) {}
  if (bcChepGiau_(c.html, c.text)) xong(); else tuChep();
}
/** Lớp 2 — bảng thật trong vùng contenteditable ẩn + execCommand('copy'); hỏng nữa thì chép chữ trơn qua textarea ẩn. */
function bcChepGiau_(html, text) {
  try {
    var o = document.createElement('div');
    o.setAttribute('contenteditable', 'true');
    o.innerHTML = html;
    o.style.cssText = 'position:fixed;left:-9999px;top:0;white-space:pre;opacity:0';
    document.body.appendChild(o);
    var r = document.createRange(); r.selectNodeContents(o);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    var ok = document.execCommand('copy');
    s.removeAllRanges();
    document.body.removeChild(o);
    if (ok) return true;
  } catch (e) {}
  try {
    var t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', '');
    t.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(t);
    t.select(); t.setSelectionRange(0, 99999);
    var ok2 = document.execCommand('copy');
    document.body.removeChild(t);
    return !!ok2;
  } catch (e2) { return false; }
}

/** ⬇ Tải. Trình duyệt trong Zalo hay chặn tải tệp mà không báo — nên câu báo luôn chỉ đường thoát. */
function bcTai_(id) {
  var o = BC_O[id], x = bcBangXuat_(o, BC_TT[id]);
  if (!x.ds.length) { bcBao_(id, '⚠️ Không có dòng nào để tải — bỏ bớt ô lọc trước đã.'); return; }
  var ten = bcTenTep_(o.tep || o.id);
  try {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bcMaHoa_(bcDungCsv_(x.cot, x.ds))], { type: 'text/csv;charset=utf-16le' }));
    a.download = ten;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 30000);
    bcBao_(id, '✅ Đã tải <b>' + bcThoat_(ten) + '</b> — ' + x.ds.length + ' dòng × ' + x.cot.length + ' cột. Mở bằng Excel là đọc được. '
      + 'Không thấy tệp? Mở trang bằng Chrome rồi bấm tải lại, hoặc dùng 📋 Chép.');
  } catch (e) {
    bcBao_(id, '⚠️ Trình duyệt này không cho tải tệp. 👉 Mở trang bằng Chrome, hoặc dùng 📋 Chép dán Excel.');
  }
}

// Xoay máy / kéo cửa sổ qua mốc 860 px → bày lại các bảng đang mở (thẻ ↔ bảng), giữ nguyên lọc + cột
(function () {
  try {
    var mq = window.matchMedia && window.matchMedia('(max-width: 860px)');
    var ve = function () { Object.keys(BC_O).forEach(function (id) { if (bcEl_('bc_kq_' + id)) bcVeKq_(id); }); };
    if (mq && mq.addEventListener) mq.addEventListener('change', ve); else if (mq && mq.addListener) mq.addListener(ve);
  } catch (e) {}
})();
