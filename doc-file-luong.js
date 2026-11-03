/**
 * ĐỌC FILE LƯƠNG theo mẫu chốt 30/10/2026 (MAU-FILE-LUONG.md) — HÀM THUẦN, không đụng trình duyệt hay mạng.
 *
 * Trang nội bộ dùng thư viện đọc Excel để đổi mỗi trang tính thành MẢNG 2 CHIỀU giá trị (hàng 0 = dòng 1, cột 0 = cột A),
 * rồi đưa vào đây. Bộ kiểm (Node) đưa mảng giả vào y như vậy — nên kiểm được mà không cần thư viện.
 *
 *   DocFileLuong.docFile({ '<tên trang>': [[...], ...], ... }, { ma_ct: 'JINBANG', ky: '2026-10' })
 *     → { ok, loi: [{trang, o, loi, cach_sua}], canh_bao: [...], nguoi: [...], tong: {...}, thong_tin: {...} }
 *
 * `ok` = không có lỗi chặn. Mọi lỗi chỉ đích danh trang + ô để kế toán sửa đúng chỗ trong Excel.
 */
(function (goc) {
  'use strict';

  // ---------- chuẩn hoá (giữ GIỐNG HỆT bản trong Code.gs — bộ kiểm so hai bên) ----------

  function boDau(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split('đ').join('d').split('Đ').join('D');
  }
  function chuanChu(v) { return boDau(v).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function chuanTenTra(v) { return chuanChu(v); }
  function chuanMaCT(v) { return boDau(String(v == null ? '' : v).trim()).toUpperCase().replace(/\s+/g, ''); }

  /** Như chuanSoGiayTo_ của Code.gs: 12 số CCCD / 9 số CMND; ô kiểu số mất 0 đầu thì thêm lại. */
  function chuanSoGiayTo(v) {
    if (typeof v === 'number') v = isFinite(v) ? Math.round(v).toString() : '';
    var s = String(v == null ? '' : v);
    if (s.charAt(0) === "'") s = s.substring(1);
    s = s.replace(/[\s.\-]/g, '');
    if (!/^\d+$/.test(s)) return '';
    if (s.length === 10 || s.length === 11) s = ('00' + s).slice(-12);
    else if (s.length === 8) s = '0' + s;
    return (s.length === 12 || s.length === 9) ? s : '';
  }

  /** "TÊN A (TÊN B)" / "TÊN A - TÊN B" → mọi tên tra được (đã chuẩn hoá), giống web phiếu lương cũ. */
  function bienTheTen(ten) {
    var s = String(ten == null ? '' : ten).replace(/\s+/g, ' ').trim();
    var ra = [];
    function them(x) { x = chuanTenTra(x).replace(/^[\s\-]+|[\s\-]+$/g, ''); if (x && ra.indexOf(x) < 0) ra.push(x); }
    var ngoaiNgoac = s.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
    them(ngoaiNgoac);
    if (ngoaiNgoac.indexOf(' - ') >= 0) ngoaiNgoac.split(' - ').forEach(them);
    var m, re = /\((.*?)\)/g;
    while ((m = re.exec(s))) them(m[1]);
    return ra;
  }

  // ---------- đọc ô ----------

  function tenCot(c) {                // 1 → A, 27 → AA
    var s = '';
    while (c > 0) { var r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); }
    return s;
  }
  function tenO(dong, cot) { return tenCot(cot) + dong; }
  function o(bang, dong, cot) {       // dòng, cột tính từ 1 như Excel
    var h = bang[dong - 1];
    if (!h) return null;
    var v = h[cot - 1];
    return v === undefined ? null : v;
  }
  function trong(v) { return v == null || (typeof v === 'string' && v.trim() === ''); }
  /** Số từ ô: số thật, hoặc chữ dạng "1.234.567" / "1,234.5". Trống → null; chữ khác → NaN. */
  function so(v) {
    if (trong(v)) return null;
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var s = String(v).trim().replace(/\s/g, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');   // 1.234.567,5
    else s = s.replace(/,/g, '');                                                               // 1,234,567.5
    var n = Number(s);
    return isFinite(n) && s !== '' ? n : NaN;
  }
  function tron(n, chuSo) { var k = Math.pow(10, chuSo); return Math.round(n * k) / k; }

  /** Số ngày Excel (1900) → 'yyyy-MM-dd'. */
  function ngayExcel(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    var d = new Date(Math.round((n - 25569) * 86400000));
    return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
  }

  // ---------- mẫu chốt ----------

  /** Ô mốc tiêu đề phải có — lệch là file khác mẫu, từ chối thay vì đọc nhầm cột. [dòng, cột, chữ phải chứa] */
  var MOC_CHAM_CONG = [[3, 3, 'cccd nha may'], [3, 5, 'ho va ten nha may'], [3, 6, 'cccd thuc'], [3, 7, 'ho va ten thuc'],
                       [3, 11, 'tuyen dung'], [4, 12, 'ca'], [4, 44, 'tong gio cong']];
  var MOC_BANG_LUONG = [[5, 3, 'cccd'], [5, 4, 'ho va ten'], [6, 18, 'hc ngay'], [6, 27, 'hc ngay'], [4, 35, 'tong cong'],
                        [5, 36, 'thuong chuyen can'], [4, 41, 'tong phu cap'], [5, 43, 'phi luu dong'], [4, 46, 'tong giam tru'],
                        [4, 47, 'thuc linh']];

  var DONG_DAU_CHAM_CONG = 7, DONG_DAU_BANG_LUONG = 8;
  var COT_NGAY_DAU = 13, SO_COT_NGAY = 31;   // M..AQ

  /** Khuôn phiếu lương (trang 3 của file) — tên dòng và cột lấy số. */
  var PHIEU_LUONG = [
    ['Tiền lương làm việc ca ngày/tháng', 18, 27], ['Tiền lương tăng ca ngày/tháng', 19, 28],
    ['Tiền lương làm việc ca đêm/tháng', 20, 29], ['Tiền lương tăng ca đêm/tháng', 21, 30],
    ['Tiền lương Ngày chủ nhật/tháng', 22, 31], ['Tiền lương chủ nhật đêm/tháng', 23, 32],
    ['Tiền lương ngày lễ/tháng', 24, 33], ['Tiền lương đêm ngày lễ/tháng', 25, 34]
  ];
  var PHIEU_PHU_CAP = [['Thưởng chuyên cần', 36], ['Hỗ trợ xăng xe, đi lại', 37], ['Hỗ trợ nhà ở (Hỗ trợ đời sống)', 38],
                       ['Hỗ trợ khác: Thâm niên, Hỗ trợ môi trường', 39], ['Ăn ca', 40]];
  var PHIEU_KHAU_TRU = [['Phí lưu động', 43], ['Tiền lưu động đã nhận', 44], ['Giảm trừ khác: Ý thức làm việc, đồng phục,…', 45]];
  var COT_TONG_LUONG = 35, COT_TONG_PHU_CAP = 41, COT_TONG_KHAU_TRU = 46, COT_THUC_LINH = 47;

  var TEN_CA = { HCN: 'HC ngày', TCN: 'Tăng ca ngày', HCD: 'HC đêm', TCD: 'Tăng ca đêm', TCCN: 'Tăng ca chủ nhật',
                 TCDCN: 'Tăng ca đêm chủ nhật', TCNL: 'Tăng ca ngày lễ', TCDNL: 'Tăng ca đêm ngày lễ' };
  /** Cột nghỉ / suất ăn ở dòng đầu mỗi người (AV..BC). */
  var COT_NGHI = [['np', 48, 'Nghỉ phép'], ['kp', 49, 'Không phép'], ['ld', 50, 'Lưu động'], ['nv', 51, 'Nghỉ việc'],
                  ['nn', 52, 'Nghỉ ngang'], ['cv', 53, 'Chờ việc'], ['cg', 54, 'Cắt giảm'], ['tsa', 55, 'Tổng suất ăn']];

  function timTrang(cacTrang, dau) {
    var ten = Object.keys(cacTrang).filter(function (t) { return chuanChu(t).indexOf(dau) === 0; });
    return ten.length ? ten[0] : '';
  }

  // ---------- đọc ----------

  function docFile(cacTrang, tuyChon) {
    tuyChon = tuyChon || {};
    var loi = [], canhBao = [];
    function chan(trang, oTen, cau, cachSua) { loi.push({ trang: trang, o: oTen, loi: cau, cach_sua: cachSua || '' }); }
    function bao(trang, oTen, cau) { canhBao.push({ trang: trang, o: oTen, loi: cau }); }
    var kq = { ok: false, loi: loi, canh_bao: canhBao, nguoi: [], tong: null, thong_tin: {} };

    var tCC = timTrang(cacTrang, '1.cham cong'), tBL = timTrang(cacTrang, '2.bang luong');
    if (!tCC) chan('', '', 'Không thấy trang "1.Chấm công …".', 'Chọn đúng file lương theo mẫu (có trang 1.Chấm công, 2.Bảng lương).');
    if (!tBL) chan('', '', 'Không thấy trang "2.Bảng lương …".', 'Chọn đúng file lương theo mẫu (có trang 1.Chấm công, 2.Bảng lương).');
    if (loi.length) return kq;
    var cc = cacTrang[tCC] || [], bl = cacTrang[tBL] || [];

    MOC_CHAM_CONG.forEach(function (m) {
      if (chuanChu(o(cc, m[0], m[1])).indexOf(m[2]) < 0) {
        chan(tCC, tenO(m[0], m[1]), 'Ô tiêu đề khác mẫu (đang là "' + String(o(cc, m[0], m[1]) || '') + '").',
             'File có thể đã chèn / xoá cột. Dùng đúng mẫu chốt, không chèn cột.');
      }
    });
    MOC_BANG_LUONG.forEach(function (m) {
      if (chuanChu(o(bl, m[0], m[1])).indexOf(m[2]) < 0) {
        chan(tBL, tenO(m[0], m[1]), 'Ô tiêu đề khác mẫu (đang là "' + String(o(bl, m[0], m[1]) || '') + '").',
             'File có thể đã chèn / xoá cột. Dùng đúng mẫu chốt, không chèn cột.');
      }
    });
    if (loi.length) return kq;

    // --- kỳ: S2 bảng lương "Tháng 10 năm 2026" ---
    var mThang = /thang\s*(\d{1,2})\s*nam\s*(\d{4})/.exec(chuanChu(o(bl, 2, 19)));
    var kyFile = mThang ? mThang[2] + '-' + ('0' + Number(mThang[1])).slice(-2) : '';
    kq.thong_tin.ky = kyFile;
    if (!kyFile) chan(tBL, 'S2', 'Không đọc được tháng ở ô S2 (cần dạng "Tháng 10 năm 2026").', 'Sửa ô S2 trang bảng lương.');
    else if (tuyChon.ky && kyFile !== tuyChon.ky) {
      chan(tBL, 'S2', 'File là lương kỳ ' + kyFile.substring(5) + '/' + kyFile.substring(0, 4) + ', ô anh/chị chọn là kỳ ' +
           tuyChon.ky.substring(5) + '/' + tuyChon.ky.substring(0, 4) + '.', 'Chọn đúng ô kỳ trên lưới, hoặc chọn đúng file.');
    }
    var mCC = /(\d{1,2})\s*\/\s*(\d{4})/.exec(chuanChu(o(cc, 3, 13)));
    if (kyFile && mCC && (mCC[2] + '-' + ('0' + Number(mCC[1])).slice(-2)) !== kyFile) {
      chan(tCC, 'M3', 'Trang chấm công ghi tháng ' + mCC[1] + '/' + mCC[2] + ', bảng lương ghi kỳ ' + kyFile + '.', 'Hai trang phải cùng một tháng.');
    }
    kq.thong_tin.nha_may = String(o(bl, 1, 1) || '').replace(/^\s*nh[aà] m[aá]y\s*:\s*/i, '').trim();
    kq.thong_tin.dia_ban = String(o(bl, 2, 1) || '').replace(/^\s*[dđ][iị]a b[aà]n\s*:\s*/i, '').trim();
    kq.thong_tin.don_vi = String(o(cc, 1, 1) || '').trim();

    // --- ngày của bảng công (dòng 4) ---
    var ngay = [];
    for (var j = 0; j < SO_COT_NGAY; j++) ngay.push(ngayExcel(o(cc, 4, COT_NGAY_DAU + j)));

    // --- chấm công: gom theo CCCD nhà máy ---
    var theoCCCD = {}, thuTu = [], maCTFile = {};
    for (var r = DONG_DAU_CHAM_CONG; r <= cc.length; r++) {
      var cRaw = o(cc, r, 3);
      if (trong(cRaw) || cRaw === 0 || cRaw === '0') continue;           // dòng khuôn trống
      var cNM = chuanSoGiayTo(cRaw);
      if (!cNM) { chan(tCC, tenO(r, 3), 'Số CCCD nhà máy không hợp lệ.', 'Cần 12 số CCCD (hoặc 9 số CMND).'); continue; }
      var mct = chuanMaCT(o(cc, r, 2));
      if (mct) maCTFile[mct] = true;
      var ng = theoCCCD[cNM];
      if (!ng) {
        var fRaw = o(cc, r, 6), cThuc = trong(fRaw) || fRaw === 0 ? '' : chuanSoGiayTo(fRaw);
        if (!trong(fRaw) && fRaw !== 0 && !cThuc) chan(tCC, tenO(r, 6), 'Số CCCD thực không hợp lệ.', 'Cần 12 số CCCD (hoặc 9 số CMND), hoặc để trống.');
        var tenNM = String(o(cc, r, 5) || '').replace(/\s+/g, ' ').trim();
        var tenThuc = String(o(cc, r, 7) || '').replace(/\s+/g, ' ').trim();
        ng = theoCCCD[cNM] = {
          dong: r, stt: o(cc, r, 1), cccd_nha_may: cNM, ten_nha_may: tenNM,
          cccd_tra: cThuc || cNM, ten_hien: tenThuc || tenNM,
          nguoi_tuyen: String(o(cc, r, 11) || '').trim(), ca: [], nghi: {}
        };
        COT_NGHI.forEach(function (x) { var v = so(o(cc, r, x[1])); if (v) ng.nghi[x[0]] = v; });
        thuTu.push(cNM);
      }
      var ma = String(o(cc, r, 12) || '').trim().toUpperCase();
      var gio = [], coSo = false;
      for (var k = 0; k < SO_COT_NGAY; k++) {
        var v = o(cc, r, COT_NGAY_DAU + k), n = so(v);
        if (n === null) gio.push(null);
        else if (isNaN(n)) { gio.push(String(v).trim()); coSo = true; }   // ký hiệu chữ: giữ nguyên để hiện đúng như file
        else { gio.push(tron(n, 2)); if (n) coSo = true; }
      }
      var tongCa = so(o(cc, r, 44));
      if (tongCa !== null && isNaN(tongCa)) chan(tCC, tenO(r, 44), 'Tổng giờ công không phải số.', 'Kiểm công thức ô tổng giờ.');
      ng.ca.push({ ma: ma, ten: TEN_CA[ma] || ma || '(không ghi ca)', gio: gio, tong: tongCa === null || isNaN(tongCa) ? null : tron(tongCa, 2),
                   co_ngay: coSo });
    }
    var dsMa = Object.keys(maCTFile);
    kq.thong_tin.ma_ct = dsMa.join(', ');
    if (tuyChon.ma_ct && dsMa.length && (dsMa.length > 1 || dsMa[0] !== chuanMaCT(tuyChon.ma_ct))) {
      chan(tCC, 'B' + DONG_DAU_CHAM_CONG, 'File ghi mã công ty ' + dsMa.join(', ') + ', ô anh/chị chọn là ' + chuanMaCT(tuyChon.ma_ct) + '.',
           'Chọn đúng công ty trên lưới, hoặc chọn đúng file.');
    }

    // --- bảng lương ---
    var daThay = {}, dongTong = null, tongThucLinh = 0;
    for (var b = DONG_DAU_BANG_LUONG; b <= bl.length; b++) {
      if (chuanChu(o(bl, b, 4)) === 'tong cong') { dongTong = b; break; }
      var raw = o(bl, b, 3);
      if (trong(raw) || raw === 0 || raw === '0') continue;
      var c = chuanSoGiayTo(raw);
      if (!c) { chan(tBL, tenO(b, 3), 'Số CCCD không hợp lệ.', 'Cần 12 số CCCD (hoặc 9 số CMND).'); continue; }
      if (daThay[c]) { chan(tBL, tenO(b, 3), 'Số CCCD này đã có ở dòng ' + daThay[c] + '.', 'Mỗi người một dòng — xoá dòng lặp.'); continue; }
      daThay[c] = b;
      var nCC = theoCCCD[c];
      if (!nCC) { chan(tBL, tenO(b, 3), 'Người ở dòng này không có trong trang chấm công.', 'Kiểm số CCCD ở hai trang có khớp nhau.'); continue; }
      var tl = so(o(bl, b, COT_THUC_LINH));
      if (tl === null || isNaN(tl)) {
        chan(tBL, tenO(b, COT_THUC_LINH), 'Ô thực lĩnh trống hoặc không phải số.', 'Mở file bằng Excel, để công thức tính xong rồi Lưu lại, sau đó chọn file lần nữa.');
        continue;
      }
      var dongLoiTien = false;
      var tien = function (cot) {
        var x = so(o(bl, b, cot));
        if (x !== null && isNaN(x)) { chan(tBL, tenO(b, cot), 'Ô tiền không phải số.', 'Sửa ô này thành số.'); dongLoiTien = true; return null; }
        return x === null ? null : Math.round(x);
      };
      var gioO = function (cot) {
        var x = so(o(bl, b, cot));
        if (x !== null && isNaN(x)) { chan(tBL, tenO(b, cot), 'Ô số giờ không phải số.', 'Sửa ô này thành số.'); dongLoiTien = true; return null; }
        return x === null ? null : tron(x, 2);
      };
      var luong = {
        luong: PHIEU_LUONG.map(function (p) { return { ten: p[0], gio: gioO(p[1]), tien: tien(p[2]) }; }),
        tong_luong: tien(COT_TONG_LUONG),
        phu_cap: PHIEU_PHU_CAP.map(function (p) { return { ten: p[0], tien: tien(p[1]) }; }),
        tong_phu_cap: tien(COT_TONG_PHU_CAP),
        khau_tru: PHIEU_KHAU_TRU.map(function (p) { return { ten: p[0], tien: tien(p[1]) }; }),
        tong_khau_tru: tien(COT_TONG_KHAU_TRU),
        thuc_linh: Math.round(tl)
      };
      if (dongLoiTien) continue;
      tongThucLinh += luong.thuc_linh;
      nCC.luong = luong;
      nCC.dong_luong = b;
    }
    if (!dongTong) bao(tBL, 'D', 'Không thấy dòng "Tổng cộng" — không đối chiếu được tổng thực lĩnh.');
    else {
      var tongFile = so(o(bl, dongTong, COT_THUC_LINH));
      kq.thong_tin.tong_dong_tong_cong = tongFile;
      if (tongFile !== null && !isNaN(tongFile) && Math.round(tongFile) !== tongThucLinh && !loi.length) {
        chan(tBL, tenO(dongTong, COT_THUC_LINH), 'Tổng thực lĩnh từng người cộng lại là ' + tongThucLinh.toLocaleString('vi-VN') +
             ' đ, dòng Tổng cộng ghi ' + Math.round(tongFile).toLocaleString('vi-VN') + ' đ.', 'Kiểm công thức dòng Tổng cộng có tính đủ mọi dòng.');
      }
    }

    // --- ghép: người có công mà không có lương (bảng lương thiếu dòng) ---
    thuTu.forEach(function (c) {
      var n = theoCCCD[c];
      if (!n.luong && !daThay[c]) {
        chan(tBL, '', 'Người ở dòng ' + n.dong + ' trang chấm công (' + n.ten_hien + ') không có trong bảng lương.',
             'Bảng lương có thể thiếu dòng công thức — kéo thêm dòng cho đủ người.');
      }
    });

    var dsNguoi = thuTu.filter(function (c) { return theoCCCD[c].luong; }).map(function (c) {
      var n = theoCCCD[c];
      var coNgay = n.ca.some(function (x) { return x.co_ngay; });
      return {
        cccd_tra: n.cccd_tra, ten_tra: bienTheTen(n.ten_hien), ten_hien: n.ten_hien,
        cccd_nha_may: n.cccd_nha_may, ten_nha_may: n.ten_nha_may, nguoi_tuyen: n.nguoi_tuyen,
        cong: { ngay: ngay, co_chi_tiet: coNgay,
                ca: n.ca.map(function (x) { return { ma: x.ma, ten: x.ten, gio: x.gio, tong: x.tong }; }), nghi: n.nghi },
        luong: n.luong
      };
    });
    var cacTra = {};
    dsNguoi.forEach(function (n) {
      if (cacTra[n.cccd_tra]) bao(tCC, '', 'Hai hồ sơ nhà máy cùng một CCCD thực (' + n.ten_hien + ') — người đó tra sẽ thấy cả hai phiếu.');
      cacTra[n.cccd_tra] = true;
    });

    kq.nguoi = dsNguoi;
    kq.tong = { so_nguoi: dsNguoi.length, tong_thuc_linh: tongThucLinh };
    if (!dsNguoi.length && !loi.length) chan(tBL, '', 'File không có người nào có lương.', 'Kiểm file đã điền dữ liệu chưa.');
    kq.ok = !loi.length;
    return kq;
  }

  goc.DocFileLuong = { docFile: docFile, chuanSoGiayTo: chuanSoGiayTo, chuanTenTra: chuanTenTra, bienTheTen: bienTheTen,
                       ngayExcel: ngayExcel, tenO: tenO };
})(typeof window !== 'undefined' ? window : globalThis);
