/**
 * LÕI LƯỚI Ô — bảng kiểu Excel cho kiểu lưới của trang nội bộ (đặc tả .scratch/ke-toan-excel/DAC-TA.md).
 * Tiêu đề nhiều tầng tự gộp ô, đóng băng dòng + cột, chữ cái cột + số dòng, hàng tổng theo lọc, chọn vùng, thanh công thức, ▾ lọc cột, xếp,
 * thu phóng, chép dán Excel, chỉ vẽ dòng đang thấy, sửa ô, dán vùng, tải .xlsx đúng màu.
 *
 * Cột: { k, tieu: [tầng…], w, kieu: 'tien'|'gio'|'dem'|'ngay'|'ngayo', mau, mauT: [màu từng tầng], tong, giua, dam, lien, lay(r), ve(r, i), lop(r), ct,
 *        cn, n: nhóm cột, chu: chữ cái cột đè (cột khoá theo file gốc), batBuoc, sua: { kieu: 'so'|'chu'|'chon', ds }, chanSua(r) → câu từ chối, suaRieng }
 * Hàm thuần (kiểm bằng Node, kiem/luoio.test.mjs): hien, soCua, docSo, locDong, xepDong, gomDong, tongCot, dsGiaTri, tieuDeTang, chuChep, chuCot, boDau.
 */
(function (goc) {
  'use strict';

  // Dải dấu thanh dựng bằng mã số: dán thẳng ký tự tổ hợp vào mã dễ bị một lần lưu khác bảng mã làm hỏng lặng lẽ
  var DAU = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
  function e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function boDau(s) { return String(s == null ? '' : s).normalize('NFD').replace(DAU, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  /** 0 → A, 26 → AA */
  function chuCot(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; }
  function tienVN(v) { return Math.round(v).toLocaleString('vi-VN'); }
  function soVN(v) { return (Math.round(v * 100) / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 }); }
  function ngayVN(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(v); }

  function giaTri(c, r) { return c.lay ? c.lay(r) : r[c.k]; }
  /** Chữ hiện trong ô. Ô trống khác ô 0: cột tiền 0 hiện "-" như file, ô trống vẫn trống. */
  function hien(c, r) {
    var v = giaTri(c, r);
    if (v == null || v === '') return '';
    if (typeof v !== 'number') return c.kieu === 'ngay' ? ngayVN(v) : String(v);
    switch (c.kieu) {
      case 'tien': return v === 0 ? '-' : tienVN(v);
      case 'gio': return v === 0 ? '-' : soVN(v);
      case 'dem': return v === 0 ? '' : soVN(v);
      case 'ngayo': return soVN(v);
      default: return String(v);
    }
  }
  function soCua(c, r) { var v = giaTri(c, r); return typeof v === 'number' ? v : null; }
  function tongCot(c, dong) {
    var t = 0, co = false;
    dong.forEach(function (r) { var n = soCua(c, r); if (n != null) { t += n; co = true; } });
    return co ? t : null;
  }

  /** Số người gõ: "4.600.000" · "4,600,000" · "1,5" · "1.5" · "500000 đ". Trống → ''. Chữ lạ → { loi }. */
  function docSo(chu) {
    var goc1 = String(chu == null ? '' : chu).trim(), s = goc1.replace(/\s|đ/gi, '');
    if (s === '') return { v: '' };
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
    var n = Number(s);
    return isNaN(n) ? { loi: 'Ô này cần số, đang ghi "' + goc1 + '". Ví dụ 4.600.000 hoặc 1,5.' } : { v: n };
  }

  /** Ô chọn nhận cách viết tự nhiên khi dán từ Excel: "co dinh", "CỐ ĐỊNH" → "Cố định". Không có trong danh sách → null. */
  function khopChon(ds, chu) {
    return ds.filter(function (x) { return boDau(x) === boDau(String(chu).trim()); })[0];
  }

  /** `loc` = { khoá cột: { chữ hiện: 1 } }. Cột đang ẩn thì lọc của nó không tính. */
  function locDong(dong, cot, loc) {
    var ds = Object.keys(loc || {}).map(function (k) { return [cot.filter(function (c) { return c.k === k; })[0], loc[k]]; }).filter(function (x) { return x[0]; });
    if (!ds.length) return dong.slice();
    return dong.filter(function (r) { return ds.every(function (x) { return x[1][hien(x[0], r)]; }); });
  }
  /** Bản đã xếp. Số theo số, chữ bỏ dấu, ô trống luôn xuống cuối (như Excel). Cùng khoá giữ thứ tự cũ. chieu: 1 tăng, -1 giảm. */
  function xepDong(dong, c, chieu) {
    if (!c) return dong.slice();
    var khoa = function (r) { var n = soCua(c, r); if (n != null) return n; var t = giaTri(c, r); return t == null || t === '' ? null : boDau(t); };
    return dong.map(function (r, i) { return { r: r, i: i, k: khoa(r) }; }).sort(function (a, b) {
      if (a.k === null || b.k === null) return a.k === b.k ? a.i - b.i : a.k === null ? 1 : -1;
      var s = typeof a.k === typeof b.k ? (a.k > b.k ? 1 : a.k < b.k ? -1 : 0) : (typeof a.k === 'number' ? -1 : 1);
      return s * chieu || a.i - b.i;
    }).map(function (x) { return x.r; });
  }
  /**
   * Gộp dòng: { khoa(r), ten(r), nguoi(r), cot }. Cột `tong` cộng lại; `so_nguoi` đếm NGƯỜI (mỗi nguoi(r) một lần), không đếm dòng.
   * Trả dòng gộp có _khoa + _mau (một dòng gốc, để bấm vào trong).
   */
  function gomDong(ds, o) {
    var theo = {}, thu = [];
    ds.forEach(function (r) {
      var k = String(o.khoa(r)), g = theo[k];
      if (!g) { g = theo[k] = { nhom: o.ten(r), _khoa: o.khoa(r), _da: {}, so_nguoi: 0, _mau: r }; thu.push(g); }
      var ng = o.nguoi(r);
      if (!g._da[ng]) { g._da[ng] = 1; g.so_nguoi++; }
      o.cot.forEach(function (c) { if (c.tong) { var v = soCua(c, r); if (v != null) g[c.k] = (g[c.k] || 0) + v; } });
    });
    return thu;
  }
  /** Giá trị khác nhau của một cột, xếp sẵn: [{ v: chữ hiện, n: số người / dòng, so: giá trị số hoặc null }]. */
  function dsGiaTri(dong, c) {
    var dem = {}, thu = [];
    dong.forEach(function (r) {
      var v = hien(c, r);
      if (dem[v] == null) { dem[v] = 0; thu.push({ v: v, so: soCua(c, r), k: boDau(v) }); }
      dem[v]++;
    });
    thu.forEach(function (x) { x.n = dem[x.v]; });
    return thu.sort(function (a, b) {
      if (a.so != null && b.so != null) return a.so - b.so;
      if (a.so != null || b.so != null) return a.so != null ? -1 : 1;
      return a.k > b.k ? 1 : a.k < b.k ? -1 : 0;
    });
  }
  /**
   * Các tầng tiêu đề, tự gộp ô giữa các cột liền nhau cùng tiền tố: [[{ j, cs, rs, chu, c, cuoi, tang }]]. Không gộp qua ranh đóng băng `bang`
   * (ô gộp vắt qua ranh thì cuộn ngang bị cắt).
   */
  function tieuDeTang(cot, bang) {
    var D = 1;
    cot.forEach(function (c) { D = Math.max(D, c.tieu.length); });
    var ra = [];
    for (var lv = 0; lv < D; lv++) {
      var hang = [];
      for (var j = 0; j < cot.length; j++) {
        var c = cot[j];
        if (c.tieu.length <= lv) continue;
        var cuoi = lv === c.tieu.length - 1, cs = 1, tien = c.tieu.slice(0, lv + 1).join('|');
        if (!cuoi) while (j + cs < cot.length && (j + cs) !== bang && cot[j + cs].tieu.length > lv + 1 && cot[j + cs].tieu.slice(0, lv + 1).join('|') === tien) cs++;
        hang.push({ j: j, cs: cs, rs: cuoi ? D - lv : 1, chu: c.tieu[lv], c: c, cuoi: cuoi, tang: lv });
        j += cs - 1;
      }
      ra.push(hang);
    }
    return ra;
  }
  function mauO(c, lv) { return (c.mauT && c.mauT[Math.min(lv, c.mauT.length - 1)]) || c.mau || '#D9D9D9'; }
  /**
   * Hai dạng để chép. HTML cho Excel: ô chữ giữ nguyên (mso-number-format @: không mất số 0 đầu CCCD), ô số có x:num để máy vùng nào cũng hiểu đúng dấu thập phân.
   * Chữ thuần cho Zalo, Notepad. `coTieuDe` = chép cả tên cột.
   */
  function chuChep(cot, dong, coTieuDe) {
    var chu = [], bang = '';
    if (coTieuDe) {
      var dau = cot.map(function (c) { return c.tieu[c.tieu.length - 1]; });
      chu.push(dau.join('\t'));
      bang += '<tr>' + dau.map(function (t) { return '<th>' + e(t) + '</th>'; }).join('') + '</tr>';
    }
    dong.forEach(function (r) {
      var o = [], h = '';
      cot.forEach(function (c) {
        var n = soCua(c, r), t = hien(c, r);
        if (n != null) { var so = Math.round(n * 100) / 100; o.push(t === '-' ? '0' : t); h += '<td x:num="' + so + '">' + e(t) + '</td>'; }
        else { o.push(String(t).replace(/[\t\r\n]+/g, ' ')); h += '<td style="mso-number-format:\'\\@\'">' + e(t) + '</td>'; }
      });
      chu.push(o.join('\t'));
      bang += '<tr>' + h + '</tr>';
    });
    return { text: chu.join('\n'), html: '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><body><table>' + bang + '</table></body></html>' };
  }

  // ================== TẢI EXCEL ==================
  var URL_EXCELJS = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
  var napDang = null;
  /** ExcelJS chỉ nạp khi bấm tải: thư viện ~1 MB, trang điện thoại không bao giờ cần. */
  function napExcelJS() {
    if (goc.ExcelJS) return Promise.resolve(goc.ExcelJS);
    if (napDang) return napDang;
    napDang = new Promise(function (xong, hong) {
      var s = document.createElement('script');
      s.src = URL_EXCELJS;
      s.onload = function () { goc.ExcelJS ? xong(goc.ExcelJS) : hong(new Error('thư viện không chạy')); };
      s.onerror = function () { napDang = null; hong(new Error('không tải được thư viện')); };
      document.head.appendChild(s);
    });
    return napDang;
  }
  var DD_SO = { tien: '#,##0;-#,##0;"-"', gio: 'General;-General;"-"', dem: 'General;-General;;@', ngayo: 'General' };
  function argb(m) { return 'FF' + String(m || '#D9D9D9').replace('#', '').toUpperCase(); }
  /** Một trang { ten, cot, dong, bang } vào workbook. Tiêu đề + màu + ô gộp theo tieuDeTang; hàng tổng là SUBTOTAL để lọc tiếp trong Excel vẫn đúng. */
  function ghiTrangExcel(wb, tr) {
    var ws = wb.addWorksheet(String(tr.ten).replace(/[\\\/?*\[\]:]/g, ' ').substring(0, 31) || 'Trang'), cot = tr.cot;
    var vien = { style: 'thin', color: { argb: 'FF808080' } }, bonVien = { top: vien, left: vien, bottom: vien, right: vien };
    var phong = { name: 'Times New Roman', size: 11 }, phongDam = { name: 'Times New Roman', size: 11, bold: true };
    ws.columns = cot.map(function (c) { return { width: Math.max(4, Math.round(c.w / 6.2)) }; });
    var tang = tieuDeTang(cot, -1), D = tang.length;
    tang.forEach(function (hang, lv) {
      ws.getRow(lv + 1).height = lv === D - 1 ? 42 : 24;
      hang.forEach(function (o) {
        var dong1 = lv + 1, dong2 = lv + o.rs, c1 = o.j + 1, c2 = o.j + o.cs;
        if (dong2 > dong1 || c2 > c1) ws.mergeCells(dong1, c1, dong2, c2);
        var x = ws.getCell(dong1, c1);
        x.value = o.chu; x.font = phongDam; x.border = bonVien;
        x.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(mauO(o.c, o.tang)) } };
      });
    });
    var coTong = cot.some(function (c) { return c.tong; }), dongTong = coTong ? D + 1 : 0, dau = D + (coTong ? 2 : 1), n = tr.dong.length;
    var chuCuon = coTong ? dongTong : D, mauVang = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    if (coTong) {
      var oTen = 0;
      cot.forEach(function (c, j) { if (j < Math.max(1, tr.bang) && c.w > cot[oTen].w) oTen = j; });
      cot.forEach(function (c, j) {
        var x = ws.getCell(dongTong, j + 1);
        x.font = phongDam; x.fill = mauVang; x.border = bonVien;
        if (c.tong) {
          var chu = chuCot(j), t = tongCot(c, tr.dong);
          x.value = n ? { formula: 'SUBTOTAL(9,' + chu + dau + ':' + chu + (dau + n - 1) + ')', result: t == null ? 0 : t } : null;
          x.numFmt = DD_SO[c.kieu] || 'General';
        } else if (j === oTen) x.value = 'Tổng theo lọc';
      });
    }
    tr.dong.forEach(function (r, i) {
      var hang = ws.getRow(dau + i), dauNguoi = r._dau;
      cot.forEach(function (c, j) {
        var x = hang.getCell(j + 1), v = giaTri(c, r), iso = c.kieu === 'ngay' && /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v == null ? '' : v));
        if (iso) { x.value = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3])); x.numFmt = 'dd/mm/yyyy'; }
        else if (typeof v === 'number') { x.value = v; x.numFmt = DD_SO[c.kieu] || 'General'; }
        else if (v != null && v !== '') { x.value = String(v); x.numFmt = '@'; }
        x.font = c.dam ? phongDam : phong;
        x.border = dauNguoi ? { top: { style: 'medium', color: { argb: 'FF404040' } }, left: vien, bottom: vien, right: vien } : bonVien;
        x.alignment = { vertical: 'middle', horizontal: c.giua || c.kieu === 'ngay' || c.kieu === 'ngayo' ? 'center' : undefined };
        if (c.cn) x.fill = mauVang;
      });
    });
    ws.autoFilter = { from: { row: chuCuon, column: 1 }, to: { row: chuCuon, column: cot.length } };
    ws.views = [{ state: 'frozen', xSplit: Math.min(tr.bang || 0, cot.length), ySplit: chuCuon }];
    return ws;
  }
  /** Dựng tệp → Uint8Array. Tách riêng để kiểm: đọc lại tệp thật bằng Python. */
  function dungTepExcel(ExcelJS, cacTrang) {
    var wb = new ExcelJS.Workbook();
    cacTrang.forEach(function (tr) { if (tr.ghi) tr.ghi(wb, tr); else ghiTrangExcel(wb, tr); });   // tr.ghi: trang phải đúng khuôn riêng của một file có sẵn
    return wb.xlsx.writeBuffer();
  }
  function luuTep(buf, tenTep) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = tenTep;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (x) {} }, 30000);
  }
  /** Tải nhiều trang vào một tệp. Báo qua `bao(câu)`. */
  function taiTep(cacTrang, tenTep, bao) {
    bao('⏳ Đang tạo tệp Excel… tháng đông có thể mất nửa phút, đừng tải lại trang.');
    return napExcelJS().then(function (X) { return dungTepExcel(X, cacTrang); }).then(function (buf) {
      luuTep(buf, tenTep);
      var so = cacTrang.reduce(function (t, tr) { return t + tr.dong.length; }, 0);
      bao('✅ Đã tải ' + tenTep + ': ' + so.toLocaleString('vi-VN') + ' dòng. Không thấy tệp thì xem mục Tải xuống của trình duyệt.');
    }, function (x) {
      bao('⚠️ Chưa tạo được tệp Excel (' + String(x && x.message || x).substring(0, 100) + '). Kiểm mạng rồi bấm lại, hoặc dùng 📋 Chép dán Excel.');
    });
  }

  // ================== LƯỚI TRÊN TRANG ==================
  /**
   * tuy: { bao(câu), mo(dòng), sauLoc(), sauSua(), suaRieng(dòng, cột), zoom: số %, khiZoom(số) }
   * Trả { ve(cấu hình), dangXem(), boLoc(), chep(), trangExcel(tên), xoa() }.
   * Cấu hình: { khoa, cot, dong, bang, tho, boTieuDe, rong, choSua, giuCuon }. Lọc + xếp cột nhớ theo `khoa`. boTieuDe: chỉ chữ cái cột + số dòng, như một trang file gốc.
   */
  function tao(vung, tuy) {
    tuy = tuy || {};
    vung.innerHTML = '<div class="xl-fx"><b class="xl-fx-o">–</b><i>fx</i><span class="xl-fx-gt"></span><em class="xl-fx-cot"></em></div>' +
      '<div class="xl-cuon" tabindex="0" aria-label="Lưới ô. Dùng phím mũi tên để di chuyển."></div><div class="xl-tt"></div><div class="xl-hop" hidden></div>';
    var cuon = vung.querySelector('.xl-cuon'), tt = vung.querySelector('.xl-tt'), hop = vung.querySelector('.xl-hop');
    var oFx = vung.querySelector('.xl-fx-o'), gtFx = vung.querySelector('.xl-fx-gt'), cotFx = vung.querySelector('.xl-fx-cot');
    var G = { ch: null, cot: [], rows: [], goc: [], H: 24, a: -1, b: -1, chon: null, trai: [], bang: 0 };
    var LOC = {}, XEP = {}, Z = tuy.zoom || 100;
    var than = function () { return vung.querySelector('.xl-than'); };

    function dungDong() {
      var ch = G.ch, loc = LOC[ch.khoa] || {}, xep = XEP[ch.khoa];
      G.cot = ch.cot; G.goc = ch.dong;
      var hop1 = locDong(ch.dong, ch.cot, loc), cx = xep && ch.cot.filter(function (c) { return c.k === xep.k; })[0];
      G.rows = xepDong(hop1, cx, xep ? xep.c : 1);
      G.bang = Math.min(ch.bang || 0, ch.cot.length);
    }
    function ve(ch) {
      G.ch = ch;
      var trenCu = ch.giuCuon ? cuon.scrollTop : 0, traiCu = ch.giuCuon ? cuon.scrollLeft : 0;
      dungDong();
      var z = Z / 100, cot = G.cot, tho = !!ch.tho;
      G.H = Math.round(24 * z);
      var rongG = Math.round(40 * z), x = rongG, trai = [];
      cot.forEach(function (c, j) { c._w = Math.round(c.w * z); trai[j] = x; x += c._w; });
      G.trai = trai;
      if (!cot.length) { cuon.innerHTML = '<div class="xl-rong">Chưa bật cột nào. 👉 Bấm ☰ Chọn cột.</div>'; veTrangThai(); veFx(); return; }
      var fO = function (j) { return j < G.bang ? ' f' + (j === G.bang - 1 ? ' f-cuoi' : '') : ''; };
      var fL = function (j) { return j < G.bang ? 'left:' + trai[j] + 'px;' : ''; };
      var loc = LOC[ch.khoa] || {}, xep = XEP[ch.khoa], tang = tieuDeTang(cot, G.bang);
      var h = '<table class="xl' + (tho ? ' tho' : '') + '" style="width:' + x + 'px;font-size:' + (14 * z).toFixed(1) + 'px"><colgroup><col style="width:' + rongG + 'px">' +
        cot.map(function (c) { return '<col style="width:' + c._w + 'px">'; }).join('') + '</colgroup><thead>';
      h += '<tr><th class="g chu-cot" data-tat="1" title="Chọn cả bảng"></th>' + cot.map(function (c, j) { return '<th class="chu-cot' + fO(j) + '" style="' + fL(j) + '" data-chu="' + j + '">' + (c.chu || chuCot(j)) + '</th>'; }).join('') + '</tr>';
      if (!ch.boTieuDe) tang.forEach(function (hang, lv) {
        h += '<tr>' + (lv === 0 ? '<th class="g" rowspan="' + tang.length + '"></th>' : '');
        hang.forEach(function (o) {
          var dx = xep && xep.k === o.c.k && o.cuoi ? (xep.c < 0 ? ' ▼' : ' ▲') : '';
          h += '<th colspan="' + o.cs + '" rowspan="' + o.rs + '" class="' + (o.cuoi && !tho ? 'co-loc' : '') + fO(o.j + o.cs - 1 < G.bang ? o.j : G.bang) + '" style="' + fL(o.j) + 'background:' + (tho ? '#fff' : mauO(o.c, o.tang)) + '">';
          h += o.cuoi ? '<span class="nhan-th" data-xep="' + o.j + '" title="Bấm để xếp">' + e(o.chu) + dx + '</span>' +
            (tho ? '' : '<button type="button" class="loc-nut' + (loc[o.c.k] ? ' dang' : '') + '" data-loc="' + o.j + '" aria-label="Lọc cột ' + e(o.chu) + '">▾</button>') : e(o.chu);
          h += '</th>';
        });
        h += '</tr>';
      });
      if (!tho && cot.some(function (c) { return c.tong; })) {
        var oChu = 0;
        cot.forEach(function (c, j) { if (j < Math.max(1, G.bang) && c.w > cot[oChu].w) oChu = j; });
        h += '<tr class="tr-tong"><th class="g"></th>';
        cot.forEach(function (c, j) {
          var v = '';
          if (c.tong) { var t = tongCot(c, G.rows); v = t == null ? '' : t === 0 ? '-' : c.kieu === 'tien' ? tienVN(t) : soVN(t); }
          else if (j === oChu) v = 'Tổng theo lọc';
          h += '<td class="' + (c.tong ? 'so' : '') + fO(j) + '" style="' + fL(j) + '">' + e(v) + '</td>';
        });
        h += '</tr>';
      }
      h += '</thead><tbody class="xl-than"></tbody></table>';
      if (!G.rows.length) h += '<div class="xl-rong">' + (G.goc.length ? 'Không có dòng nào khớp. 👉 Bỏ lọc ▾ trên tiêu đề cột, hoặc bấm ↺ Chọn lại từ đầu.' : (ch.rong || 'Chưa có dòng nào.')) + '</div>';
      cuon.innerHTML = h;
      G.a = -1; G.b = -1;
      if (G.chon && (G.chon.r1 >= G.rows.length || G.chon.c1 >= cot.length)) G.chon = null;
      cuon.scrollTop = trenCu; cuon.scrollLeft = traiCu;
      veDong(true);
      veTrangThai(); veFx();
    }
    function veDong(ep) {
      var tb = than(); if (!tb) return;
      var H = G.H, n = G.rows.length, dau = Math.floor(cuon.scrollTop / H), so = Math.ceil(cuon.clientHeight / H) + 2;
      if (!ep && (dau >= G.a + 6 || G.a === 0) && (dau + so <= G.b - 6 || G.b === n)) return;
      var a = Math.max(0, dau - 18), b = Math.min(n, dau + so + 18), nC = G.cot.length + 1, h = '';
      if (a > 0) h += '<tr class="dem" style="height:' + (a * H) + 'px"><td colspan="' + nC + '"></td></tr>';
      for (var i = a; i < b; i++) h += dongHtml(G.rows[i], i);
      if (b < n) h += '<tr class="dem" style="height:' + ((n - b) * H) + 'px"><td colspan="' + nC + '"></td></tr>';
      tb.innerHTML = h; G.a = a; G.b = b;
      toChon();
    }
    function dongHtml(r, i) {
      var h = '<tr data-r="' + i + '" class="' + (r._dau ? 'dau' : '') + '" style="height:' + G.H + 'px"><td class="g" data-g="' + i + '">' + (i + 1) + '</td>';
      G.cot.forEach(function (c, j) {
        var lop = [], v = hien(c, r), noi = e(v);
        if (j < G.bang) { lop.push('f'); if (j === G.bang - 1) lop.push('f-cuoi'); }
        if (c.kieu === 'tien' || c.kieu === 'gio' || c.kieu === 'dem') lop.push('so');
        if (c.giua) lop.push('giua');
        if (c.dam) lop.push('dam');
        if (c.kieu === 'ngayo') { lop.push('ngay-o'); if (typeof giaTri(c, r) === 'string') lop.push(/^(kp|nn)$/i.test(giaTri(c, r)) ? 'ma-do' : 'ma-ngay'); }
        if (c.cn) lop.push('cn');
        if (c.lop) { var l = c.lop(r); if (l) lop.push(l); }
        if (r._sua && r._sua[c.k]) lop.push('o-sua');
        if (r._loi && r._loi[c.k]) lop.push('o-sai');
        var bichan = c.chanSua && c.chanSua(r);
        if (c.batBuoc && v === '' && !bichan) lop.push('o-thieu');
        if (bichan && c.xamKhiChan) lop.push('khoa-o');
        if (c.lien && v) noi = '<button type="button" class="lien" data-lien="' + i + '">' + e(v) + '</button>';
        if (c.ve) noi = c.ve(r, i);
        h += '<td class="' + lop.join(' ') + '" data-c="' + j + '"' + (j < G.bang ? ' style="left:' + G.trai[j] + 'px"' : '') + '>' + noi + '</td>';
      });
      return h + '</tr>';
    }
    function toChon() {
      var ch = G.chon, tb = than(); if (!tb) return;
      [].forEach.call(tb.children, function (tr) {
        if (!tr.hasAttribute('data-r')) return;
        var i = Number(tr.getAttribute('data-r')), trong = ch && i >= Math.min(ch.r1, ch.r2) && i <= Math.max(ch.r1, ch.r2);
        [].forEach.call(tr.children, function (td) {
          var jj = td.getAttribute('data-c');
          if (jj == null) { td.classList.toggle('sang', !!trong); return; }
          var j = Number(jj), co = trong && j >= Math.min(ch.c1, ch.c2) && j <= Math.max(ch.c1, ch.c2);
          td.classList.toggle('chon', !!co && !(ch.r1 === ch.r2 && ch.c1 === ch.c2));
          td.classList.toggle('o-chinh', !!ch && i === ch.r1 && j === ch.c1);
        });
      });
      [].forEach.call(vung.querySelectorAll('.chu-cot[data-chu]'), function (th) {
        var j = Number(th.getAttribute('data-chu'));
        th.classList.toggle('sang', !!ch && j >= Math.min(ch.c1, ch.c2) && j <= Math.max(ch.c1, ch.c2));
      });
    }
    function veFx() {
      var ch = G.chon;
      if (!ch || !G.rows[ch.r1] || !G.cot[ch.c1]) { oFx.textContent = '–'; gtFx.textContent = ''; cotFx.textContent = 'Bấm vào một ô để xem cách tính.'; cotFx.title = ''; return; }
      var c = G.cot[ch.c1], r = G.rows[ch.r1];
      oFx.textContent = (c.chu || chuCot(ch.c1)) + (ch.r1 + 1);
      gtFx.textContent = r._loi && r._loi[c.k] ? '⛔ ' + r._loi[c.k] : hien(c, r);
      cotFx.textContent = c.tieu.join(' › ') + (c.ct ? ': ' + c.ct : '');
      cotFx.title = cotFx.textContent;
    }
    function veTrangThai() {
      var ch = G.chon, ban = '', tong = G.goc.length;
      var dau = '<span>Đang hiện <b>' + G.rows.length.toLocaleString('vi-VN') + '</b> dòng' + (G.rows.length < tong ? ' trong ' + tong.toLocaleString('vi-VN') + ' (đang lọc)' : '') + '</span>';
      if (ch && (ch.r1 !== ch.r2 || ch.c1 !== ch.c2)) {
        var d = 0, t = 0, ns = 0;
        for (var i = Math.min(ch.r1, ch.r2); i <= Math.max(ch.r1, ch.r2); i++) {
          for (var j = Math.min(ch.c1, ch.c2); j <= Math.max(ch.c1, ch.c2); j++) {
            var c = G.cot[j], r = G.rows[i]; if (!c || !r) continue;
            if (hien(c, r) !== '') d++;
            var n = soCua(c, r); if (n != null) { t += n; ns++; }
          }
        }
        var dep = function (x) { return Math.abs(x) >= 1000 ? tienVN(x) : soVN(x); };
        ban = '<span>Đã chọn: Đếm <b>' + d.toLocaleString('vi-VN') + '</b>' + (ns ? ' · Tổng <b>' + dep(t) + '</b> · Trung bình <b>' + dep(t / ns) + '</b>' : '') + '</span>';
      } else ban = '<span class="xl-mo">Kéo chuột chọn nhiều ô để xem tổng. Ctrl + C để chép dán sang Excel.</span>';
      tt.innerHTML = dau + ban + '<span class="xl-gian"></span><span class="xl-zoom"><button type="button" data-zoom="-10" aria-label="Thu nhỏ">−</button><span>' + Z + '%</span><button type="button" data-zoom="10" aria-label="Phóng to">+</button></span>';
    }

    // ---- hộp lọc cột ----
    function dongHop() { hop.hidden = true; }
    function moLoc(j, nut) {
      var c = G.cot[j], kt = G.ch.khoa, loc = LOC[kt] = LOC[kt] || {};
      var khac = {}; Object.keys(loc).forEach(function (k) { if (k !== c.k) khac[k] = loc[k]; });
      var thu = dsGiaTri(locDong(G.goc, G.cot, khac), c), chon = {};
      thu.forEach(function (x) { chon[x.v] = loc[c.k] ? !!loc[c.k][x.v] : true; });
      var laSo = c.kieu === 'tien' || c.kieu === 'gio' || c.kieu === 'dem' || c.kieu === 'ngayo';
      function veDs(q) {
        var qq = boDau(q || ''), ds = thu.filter(function (x) { return !qq || x.k.indexOf(qq) >= 0; }).slice(0, 400);
        hop.querySelector('.xl-ds').innerHTML = ds.map(function (x) {
          return '<button type="button" class="xl-dong" data-gt="' + e(x.v) + '" aria-pressed="' + !!chon[x.v] + '"><span class="xl-tich"></span><span class="xl-ten">' + (x.v === '' ? '(Ô trống)' : e(x.v)) + '</span><span class="xl-dem">' + x.n + '</span></button>';
        }).join('') || '<div class="xl-mo">Không có giá trị nào khớp.</div>';
      }
      hop.innerHTML = '<b>Lọc cột: ' + e(c.tieu[c.tieu.length - 1]) + '</b><div class="xl-hang"><button type="button" data-lx="tang">' + (laSo ? 'Nhỏ → lớn' : 'A → Z') + '</button><button type="button" data-lx="giam">' + (laSo ? 'Lớn → nhỏ' : 'Z → A') + '</button></div>' +
        (laSo ? '<div class="xl-hang"><button type="button" data-lx="khac0">Chỉ ô có số</button><button type="button" data-lx="trong">Chỉ ô trống</button></div>' : '') +
        '<input class="xl-tim" type="search" placeholder="🔎 Tìm trong cột" aria-label="Tìm trong cột"><div class="xl-hang"><button type="button" data-lx="het">☑ Chọn hết</button><button type="button" data-lx="bo">☐ Bỏ hết</button></div><div class="xl-ds"></div>' +
        '<div class="xl-hang"><button type="button" class="chinh" data-lx="ok">Lọc</button><button type="button" data-lx="xoa">Bỏ lọc cột này</button><button type="button" data-lx="thoi">Thôi</button></div>';
      veDs('');
      hop.hidden = false;
      var b = nut.getBoundingClientRect();
      hop.style.left = Math.max(8, Math.min(window.innerWidth - hop.offsetWidth - 8, b.left - 8)) + 'px';
      hop.style.top = Math.max(8, Math.min(window.innerHeight - hop.offsetHeight - 8, b.bottom + 4)) + 'px';
      hop.querySelector('.xl-tim').oninput = function () { veDs(this.value); };
      hop.onclick = function (ev) {
        var g = ev.target.closest('[data-gt]'), x = ev.target.closest('[data-lx]');
        if (g) { var v = g.getAttribute('data-gt'); chon[v] = !chon[v]; g.setAttribute('aria-pressed', !!chon[v]); return; }
        if (!x) return;
        var a = x.getAttribute('data-lx');
        if (a === 'tang' || a === 'giam') { XEP[kt] = { k: c.k, c: a === 'tang' ? 1 : -1 }; dongHop(); veLai(); return; }
        if (a === 'het' || a === 'bo') { thu.forEach(function (y) { chon[y.v] = a === 'het'; }); veDs(hop.querySelector('.xl-tim').value); return; }
        if (a === 'khac0' || a === 'trong') thu.forEach(function (y) { var tr = y.v === '' || y.v === '-'; chon[y.v] = a === 'trong' ? tr : !tr; });
        if (a === 'xoa') { delete loc[c.k]; dongHop(); veLai(); return; }
        if (a === 'thoi') { dongHop(); return; }
        if (a === 'ok' || a === 'khac0' || a === 'trong') {
          if (thu.every(function (y) { return chon[y.v]; })) delete loc[c.k];
          else { var o = {}; thu.forEach(function (y) { if (chon[y.v]) o[y.v] = 1; }); loc[c.k] = o; }
          dongHop(); veLai();
        }
      };
    }
    function veLai() { var ch = G.ch; ch.giuCuon = false; ve(ch); if (tuy.sauLoc) tuy.sauLoc(); }

    // ---- sửa ô ----
    function ghiO(r, c, chu) {
      r._sua = r._sua || {}; r._loi = r._loi || {};
      if (c.sua.kieu === 'so') {
        var k = docSo(chu);
        if (k.loi) { r._loi[c.k] = k.loi; r[c.k] = String(chu); r._sua[c.k] = 1; if (tuy.bao) tuy.bao('⛔ ' + k.loi); return; }
        delete r._loi[c.k];
        if (String(k.v) !== String(r[c.k] == null ? '' : r[c.k])) { r[c.k] = k.v; r._sua[c.k] = 1; }
        return;
      }
      if (c.sua.kieu === 'chon' && chu !== '') {
        var dung = khopChon(c.sua.ds, chu);
        if (dung == null) {
          r._loi[c.k] = 'Ô này chọn một trong: ' + c.sua.ds.join(', ') + '.'; r[c.k] = chu; r._sua[c.k] = 1;
          if (tuy.bao) tuy.bao('⛔ ' + r._loi[c.k]);
          return;
        }
        chu = dung;
      }
      delete r._loi[c.k];
      var moi = String(chu).trim();
      if (moi !== String(r[c.k] == null ? '' : r[c.k])) { r[c.k] = moi; r._sua[c.k] = 1; }
    }
    function batSua(i, j, chuDau) {
      var c = G.cot[j], r = G.rows[i];
      if (c.suaRieng) { if (tuy.suaRieng) tuy.suaRieng(r, c); return; }
      if (!G.ch.choSua || !c.sua) return;
      var chan = c.chanSua ? c.chanSua(r) : '';
      if (chan) { if (tuy.bao) tuy.bao(chan); return; }
      var td = vung.querySelector('.xl-than tr[data-r="' + i + '"] td[data-c="' + j + '"]'); if (!td) return;
      var cu = r[c.k] == null ? '' : String(r[c.k]);
      if (c.sua.kieu === 'chon') td.innerHTML = '<select class="o-go" aria-label="' + e(c.tieu[c.tieu.length - 1]) + '">' + [''].concat(c.sua.ds).map(function (x) { return '<option' + (x === cu ? ' selected' : '') + '>' + e(x) + '</option>'; }).join('') + '</select>';
      else td.innerHTML = '<input class="o-go" autocomplete="off" aria-label="' + e(c.tieu[c.tieu.length - 1]) + '" value="' + e(chuDau != null ? chuDau : (c.sua.kieu === 'so' && cu !== '' ? cu.replace('.', ',') : cu)) + '">';
      var o = td.querySelector('.o-go'), xong = false;
      o.focus(); if (chuDau == null && o.select) o.select();
      function ket(ghi, buoc) {
        if (xong) return; xong = true;
        if (ghi) ghiO(r, c, o.value);
        veDong(true); veFx(); cuon.focus({ preventScroll: true });
        if (ghi && tuy.sauSua) tuy.sauSua(r, c);
        if (buoc) diChuyen(buoc[0], buoc[1], false);
      }
      o.onkeydown = function (ev) {
        ev.stopPropagation();
        if (ev.key === 'Enter') { ev.preventDefault(); ket(true, [1, 0]); }
        else if (ev.key === 'Tab') { ev.preventDefault(); ket(true, [0, 1]); }
        else if (ev.key === 'Escape') ket(false);
      };
      o.onblur = function () { ket(true); };
      if (c.sua.kieu === 'chon') o.onchange = function () { ket(true); };
    }
    function diChuyen(dr, dc, mo) {
      if (!G.rows.length || !G.cot.length) return;
      var ch = G.chon || { r1: 0, c1: 0, r2: 0, c2: 0 };
      var r = Math.max(0, Math.min(G.rows.length - 1, (mo ? ch.r2 : ch.r1) + dr)), c = Math.max(0, Math.min(G.cot.length - 1, (mo ? ch.c2 : ch.c1) + dc));
      G.chon = mo ? { r1: ch.r1, c1: ch.c1, r2: r, c2: c } : { r1: r, c1: c, r2: r, c2: c };
      var H = G.H, bang = vung.querySelector('table.xl'), the = bang && bang.tHead ? bang.tHead.offsetHeight : 0, y = r * H;
      if (y < cuon.scrollTop) cuon.scrollTop = y; else if (y + H + the > cuon.scrollTop + cuon.clientHeight) cuon.scrollTop = y + H + the - cuon.clientHeight;
      if (c >= G.bang) {
        var x = G.trai[c], w = G.cot[c]._w, l = G.trai[G.bang] != null ? G.trai[G.bang] : G.trai[0];
        if (x - l < cuon.scrollLeft) cuon.scrollLeft = x - l; else if (x + w > cuon.scrollLeft + cuon.clientWidth) cuon.scrollLeft = x + w - cuon.clientWidth;
      }
      veDong(true); veTrangThai(); veFx();
    }
    function vungChep() {
      var ch = G.chon;
      if (!ch) return { cot: G.cot, dong: G.rows, tieu: true };
      var r1 = Math.min(ch.r1, ch.r2), r2 = Math.max(ch.r1, ch.r2), c1 = Math.min(ch.c1, ch.c2), c2 = Math.max(ch.c1, ch.c2);
      return { cot: G.cot.slice(c1, c2 + 1), dong: G.rows.slice(r1, r2 + 1), tieu: false };
    }
    var nutChep = false;
    // Ghi qua sự kiện copy: giữ nguyên HTML cho Excel (x:num, mso-number-format). Bảng nháy không đòi quyền, trình duyệt nào cũng có
    document.addEventListener('copy', function (ev) {
      if (!nutChep && document.activeElement !== cuon) return;
      if (!G.ch) return;
      var v = vungChep(), c = chuChep(v.cot, v.dong, v.tieu);
      ev.clipboardData.setData('text/plain', c.text);
      ev.clipboardData.setData('text/html', c.html);
      ev.preventDefault();
      nutChep = false;
      if (tuy.bao) tuy.bao('✅ Đã chép ' + v.dong.length + ' dòng × ' + v.cot.length + ' cột. Mở Excel, bấm Ctrl + V.');
    });
    function chep() {
      nutChep = true;
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (x) {}
      if (!ok) { nutChep = false; if (tuy.bao) tuy.bao('⚠️ Trình duyệt này chặn tự chép. Bấm vào lưới rồi nhấn Ctrl + C, hoặc dùng ⬇ Tải Excel.'); }
    }

    // ---- sự kiện ----
    var keo = false, hen = 0;
    cuon.addEventListener('scroll', function () { if (hen) return; hen = requestAnimationFrame(function () { hen = 0; veDong(false); }); });
    vung.addEventListener('click', function (ev) {
      var t = ev.target, c;
      if ((c = t.closest('[data-loc]'))) { ev.stopPropagation(); moLoc(Number(c.getAttribute('data-loc')), c); return; }
      if ((c = t.closest('[data-xep]'))) {
        var cx = G.cot[Number(c.getAttribute('data-xep'))], kt = G.ch.khoa, x = XEP[kt], la = cx.kieu === 'tien' || cx.kieu === 'gio' || cx.kieu === 'dem';
        if (!x || x.k !== cx.k) XEP[kt] = { k: cx.k, c: la ? -1 : 1 }; else if (x.c === (la ? -1 : 1)) x.c = -x.c; else delete XEP[kt];
        veLai(); return;
      }
      if ((c = t.closest('[data-zoom]'))) {
        Z = Math.max(70, Math.min(150, Z + Number(c.getAttribute('data-zoom'))));
        if (tuy.khiZoom) tuy.khiZoom(Z);
        var ch = G.ch; if (ch) { ch.giuCuon = true; ve(ch); }
        return;
      }
      if ((c = t.closest('[data-lien]'))) { if (tuy.mo) tuy.mo(G.rows[Number(c.getAttribute('data-lien'))]); return; }
      if ((c = t.closest('[data-chu]'))) { var jj = Number(c.getAttribute('data-chu')); G.chon = { r1: 0, c1: jj, r2: Math.max(0, G.rows.length - 1), c2: jj }; toChon(); veTrangThai(); veFx(); return; }
      if (t.closest('[data-tat]')) { G.chon = { r1: 0, c1: 0, r2: Math.max(0, G.rows.length - 1), c2: Math.max(0, G.cot.length - 1) }; toChon(); veTrangThai(); veFx(); }
    });
    document.addEventListener('click', function (ev) { if (!hop.hidden && !ev.target.closest('.xl-hop') && !ev.target.closest('[data-loc]')) dongHop(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !hop.hidden) dongHop(); });
    cuon.addEventListener('mousedown', function (ev) {
      var t = ev.target;
      if (t.closest('button,input,select')) return;
      var g = t.closest('td[data-g]');
      if (g) { var i0 = Number(g.getAttribute('data-g')); G.chon = { r1: i0, c1: 0, r2: i0, c2: G.cot.length - 1 }; toChon(); veTrangThai(); veFx(); cuon.focus({ preventScroll: true }); return; }
      var td = t.closest('.xl-than td[data-c]'); if (!td) return;
      var i = Number(td.parentNode.getAttribute('data-r')), j = Number(td.getAttribute('data-c'));
      if (ev.shiftKey && G.chon) { G.chon.r2 = i; G.chon.c2 = j; } else G.chon = { r1: i, c1: j, r2: i, c2: j };
      keo = true; toChon(); veTrangThai(); veFx(); cuon.focus({ preventScroll: true }); ev.preventDefault();
    });
    cuon.addEventListener('mouseover', function (ev) {
      if (!keo) return;
      var td = ev.target.closest('.xl-than td[data-c]'); if (!td) return;
      G.chon.r2 = Number(td.parentNode.getAttribute('data-r')); G.chon.c2 = Number(td.getAttribute('data-c'));
      toChon(); veTrangThai();
    });
    document.addEventListener('mouseup', function () { keo = false; });
    cuon.addEventListener('dblclick', function (ev) {
      var td = ev.target.closest('.xl-than td[data-c]');
      if (td && !ev.target.closest('button,input,select')) batSua(Number(td.parentNode.getAttribute('data-r')), Number(td.getAttribute('data-c')));
    });
    cuon.addEventListener('keydown', function (ev) {
      if (ev.target.classList.contains('o-go')) return;
      var ch = G.chon, ctrl = ev.ctrlKey || ev.metaKey, dt = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Tab: [0, 1], Enter: [1, 0] }[ev.key];
      if (ctrl && (ev.key === 'a' || ev.key === 'A')) { ev.preventDefault(); G.chon = { r1: 0, c1: 0, r2: Math.max(0, G.rows.length - 1), c2: Math.max(0, G.cot.length - 1) }; toChon(); veTrangThai(); return; }
      if (dt) { ev.preventDefault(); diChuyen(dt[0], dt[1], ev.shiftKey && ev.key.indexOf('Arrow') === 0); return; }
      if (!ch || !G.cot[ch.c1]) return;
      var c = G.cot[ch.c1];
      if (ev.key === 'F2') { ev.preventDefault(); batSua(ch.r1, ch.c1); return; }
      if (!G.ch.choSua || !c.sua) return;
      var chan = c.chanSua ? c.chanSua(G.rows[ch.r1]) : '';
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        ev.preventDefault();
        if (chan) { if (tuy.bao) tuy.bao(chan); return; }
        ghiO(G.rows[ch.r1], c, ''); veDong(true); if (tuy.sauSua) tuy.sauSua(G.rows[ch.r1], c);
        return;
      }
      if (ev.key.length === 1 && !ctrl && !ev.altKey && c.sua.kieu !== 'chon') { ev.preventDefault(); batSua(ch.r1, ch.c1, ev.key); }
    });
    cuon.addEventListener('paste', function (ev) {
      var ch = G.chon;
      if (!ch || !G.ch.choSua) return;
      var txt = ev.clipboardData && ev.clipboardData.getData ? ev.clipboardData.getData('text/plain') : '';
      if (!txt) return;
      ev.preventDefault();
      var n = 0, bo = 0;
      txt.replace(/\r/g, '').replace(/\n$/, '').split('\n').forEach(function (d, i) {
        d.split('\t').forEach(function (v, j) {
          var r = G.rows[ch.r1 + i], c = G.cot[ch.c1 + j];
          if (!r || !c) { bo++; return; }
          if (!c.sua || (c.chanSua && c.chanSua(r))) { bo++; return; }
          ghiO(r, c, v); n++;
        });
      });
      veDong(true); if (tuy.sauSua) tuy.sauSua();
      if (tuy.bao) tuy.bao('Đã dán ' + n + ' ô' + (bo ? ', bỏ qua ' + bo + ' ô không gõ được' : '') + '. Ô vàng là ô vừa đổi, bấm 💾 Lưu để giữ.');
    });
    window.addEventListener('resize', function () { if (G.ch) veDong(true); });

    return {
      ve: ve,
      veLaiDong: function () { veDong(true); },
      dangXem: function () { return { cot: G.cot, dong: G.rows, bang: G.bang }; },
      boLoc: function (khoa) { if (khoa) { delete LOC[khoa]; delete XEP[khoa]; } else { LOC = {}; XEP = {}; } },
      coLoc: function (khoa) { return !!(LOC[khoa] && Object.keys(LOC[khoa]).length); },
      chep: chep,
      /** Đưa con trỏ tới ô: dùng cho "🔎 Tới ô sai". */
      toiO: function (r, c) { G.chon = { r1: r, c1: c, r2: r, c2: c }; cuon.focus({ preventScroll: true }); diChuyen(0, 0, false); },
      trangExcel: function (ten) { return { ten: ten, cot: G.cot, dong: G.rows, bang: G.bang }; },
      moSua: batSua,
      dongHop: dongHop
    };
  }

  goc.LuoiO = {
    e: e, boDau: boDau, chuCot: chuCot, tienVN: tienVN, soVN: soVN, ngayVN: ngayVN, hien: hien, soCua: soCua, tongCot: tongCot, docSo: docSo, khopChon: khopChon,
    locDong: locDong, xepDong: xepDong, gomDong: gomDong, dsGiaTri: dsGiaTri, tieuDeTang: tieuDeTang, chuChep: chuChep,
    dungTepExcel: dungTepExcel, napExcelJS: napExcelJS, taiTep: taiTep, tao: tao
  };
})(typeof window !== 'undefined' ? window : globalThis);
