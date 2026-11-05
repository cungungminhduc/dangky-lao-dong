/**
 * ĐỌC FILE GIỜ TUYỂN DỤNG (đợt 3a) — HÀM THUẦN, không đụng trình duyệt hay mạng.
 * Đặc tả: tool-tuyendung-zalo/.scratch/gio-tien-tuyen-dung/DAC-TA.md MỤC 0 · mẫu: cong-luong-doi-soat/MAU-FILE-GIO.md.
 * Từ 05/11/2026 CHỈ CÒN GIỜ + Đạt (Dương bỏ tiền): không bảng giá, không tiền, không đọc cột Ngoại tỉnh.
 *
 *   DocFileGio.docFile({ '<tên trang>': [[...], ...] }, { thang: '2026-08' })
 *     → { ok, loi: [{trang, o, loi, cach_sua}], dong: [...], tong: {...}, nha_may: [...], trang: [...] }
 *   DocFileGio.tinhDong({ cccd, dat }) → { tinh_trang: 'dat' | 'khong_dat' | 'chua_ro', ly_do } (máy chủ có bản GIỐNG HỆT: tinhDongGio_)
 *
 * `ok` = không có lỗi chặn. Lỗi chặn = file sai về GIỜ / định danh (giờ lỗi, thiếu nhà máy / người tuyển, trùng, hai CCCD khác nhau).
 * KHÔNG chặn: không đạt, ô Đạt trống / lỗi (→ chưa rõ), thiếu CCCD — dòng vẫn lưu với giờ, ghi chú để báo lại.
 */
(function (goc) {
  'use strict';

  // ---------- chuẩn hoá (giữ GIỐNG HỆT bản trong Code.gs — bộ kiểm so hai bên) ----------

  function boDau(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split('đ').join('d').split('Đ').join('D');
  }
  function chuanChu(v) { return boDau(v).toLowerCase().replace(/\s+/g, ' ').trim(); }
  /** Mã tính lương / mã nhà máy: IN HOA, bỏ dấu, bỏ khoảng trắng ("FEVC ĐM" → "FEVCDM"). */
  function chuanMa(v) { return boDau(String(v == null ? '' : v).trim()).toUpperCase().replace(/\s+/g, ''); }

  /** Đúng 12 số CCCD; ô kiểu số mất 0 đầu (10–11 số) thì thêm lại. CMND 9 số không nhận — không làm thuế được. */
  function chuanCCCD(v) {
    if (typeof v === 'number') v = isFinite(v) ? Math.round(v).toString() : '';
    var s = String(v == null ? '' : v);
    if (s.charAt(0) === "'") s = s.substring(1);
    s = s.replace(/[\s.\-]/g, '');
    if (!/^\d+$/.test(s)) return '';
    if (s.length === 10 || s.length === 11) s = ('00' + s).slice(-12);
    return s.length === 12 ? s : '';
  }

  // ---------- đọc ô ----------

  function tenCot(c) {
    var s = '';
    while (c > 0) { var r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); }
    return s;
  }
  function o(bang, dong, cot) {
    var h = bang[dong - 1];
    if (!h) return null;
    var v = h[cot - 1];
    return v === undefined ? null : v;
  }
  function trong(v) { return v == null || (typeof v === 'string' && v.trim() === ''); }
  function so(v) {
    if (trong(v)) return null;
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var s = String(v).trim().replace(/\s/g, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    var n = Number(s);
    return isFinite(n) && s !== '' ? n : NaN;
  }

  // ---------- mẫu file giờ ----------

  // Cột (tính từ 1): D=4 CCCD (Bắc Giang), E=5 CCCD (Quảng Ninh), F=6 họ tên, J=10 người tuyển, T=20 tổng giờ,
  // U=21 nhà máy, AB=28 xét điều kiện Đạt. (Cột AN "ngoại tỉnh" là để tính giá — không đọc từ 05/11/2026.)
  var C = { D: 4, E: 5, F: 6, J: 10, T: 20, U: 21, AB: 28 };
  /** Ô tiêu đề dòng 1 phải chứa — lệch là file khác mẫu, từ chối thay vì đọc nhầm cột. */
  var MOC = [[C.D, 'ma code'], [C.F, 'ho va ten'], [C.J, 'nguoi tuyen dung'], [C.T, 'tong gio'], [C.U, 'ten nha may'],
             [C.AB, 'xet dieu kien']];
  var DONG_DAU = 4;

  function laTrangGio(ten) { return chuanChu(ten).replace(/\s/g, '').indexOf('2.cgt') === 0; }
  /** "2.CGT8.2026 Quảng Ninh" → '2026-08'; không đọc được → ''. */
  function thangCuaTrang(ten) {
    var m = /cgt\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(chuanChu(ten));
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return '';
    return m[2] + '-' + ('0' + Number(m[1])).slice(-2);
  }
  function thangHien(t) { return t ? Number(t.substring(5)) + '/' + t.substring(0, 4) : ''; }

  /**
   * Một dòng thô → tình trạng Đạt + ghi chú. Dùng chung trang + máy chủ (máy chủ có bản giống hệt).
   * `dat`: true = ĐẠT · false = KHÔNG ĐẠT · null = ô Đạt trống / lỗi (chưa rõ). Thiếu CCCD chỉ là ghi chú — giờ vẫn giữ.
   */
  function tinhDong(d) {
    var ghi = [];
    if (!d.cccd) ghi.push('Thiếu số CCCD 12 số trong file');
    if (d.dat !== true && d.dat !== false) ghi.push('Ô Đạt trống hoặc lỗi trong file');
    return { tinh_trang: d.dat === true ? 'dat' : d.dat === false ? 'khong_dat' : 'chua_ro', ly_do: ghi.join(' · ') };
  }

  function docFile(cacTrang, tc) {
    tc = tc || {};
    var loi = [], dong = [];
    var them = function (trang, oTen, cau, cach) { loi.push({ trang: trang, o: oTen, loi: cau, cach_sua: cach || '' }); };
    var ds = Object.keys(cacTrang || {}).filter(laTrangGio);
    if (!ds.length) {
      them('', '', 'File không có trang giờ nào (tên trang phải bắt đầu bằng "2.CGT", vd "2.CGT8.2026 Quảng Ninh").',
           'Chọn đúng file tính giờ của kế toán.');
      return ketQua(loi, dong, ds);
    }
    ds.forEach(function (ten) {
      var bang = cacTrang[ten];
      var tTrang = thangCuaTrang(ten);
      if (tc.thang && tTrang && tTrang !== tc.thang) {
        them(ten, '', 'Trang này là tháng ' + thangHien(tTrang) + ', đang chọn tháng ' + thangHien(tc.thang) + '.',
             'Chọn lại đúng tháng, hoặc chọn đúng file.');
        return;
      }
      var lech = MOC.filter(function (m) { return chuanChu(o(bang, 1, m[0])).indexOf(m[1]) < 0; });
      if (lech.length) {
        them(ten, tenCot(lech[0][0]) + '1', 'Tiêu đề cột không đúng mẫu (cần có chữ "' + lech[0][1] + '", đang là "' +
             String(o(bang, 1, lech[0][0]) == null ? '' : o(bang, 1, lech[0][0])).substring(0, 40) + '").',
             'File khác mẫu tháng 8 — đừng chèn / xoá cột. Hỏi người làm hệ nếu mẫu đã đổi.');
        return;
      }
      for (var r = DONG_DAU; r <= bang.length; r++) {
        if (trong(o(bang, r, C.F))) continue;                      // dòng trống còn công thức
        var dongLoi = false;
        var cD = chuanCCCD(o(bang, r, C.D)), cE = chuanCCCD(o(bang, r, C.E));
        if (cD && cE && cD !== cE) {
          them(ten, 'D' + r, 'Hai ô CCCD (D' + r + ' và E' + r + ') khác nhau.', 'Để đúng một số CCCD của người này.');
          dongLoi = true;
        }
        // Ô Đạt trống / lỗi công thức / chữ lạ → chưa rõ, KHÔNG chặn (Dương chốt 05/11: kế toán chỉ cần đẩy giờ lên)
        var dat = chuanChu(o(bang, r, C.AB));
        var gio = so(o(bang, r, C.T));
        if (gio == null || isNaN(gio) || gio < 0) {
          them(ten, 'T' + r, 'Tổng giờ không phải số hợp lệ.', 'Sửa ô Tổng giờ.');
          dongLoi = true;
        }
        var ma = String(o(bang, r, C.U) == null ? '' : o(bang, r, C.U)).trim();
        if (!ma) { them(ten, 'U' + r, 'Thiếu tên nhà máy làm việc.', 'Điền tên nhà máy.'); dongLoi = true; }
        var nt = String(o(bang, r, C.J) == null ? '' : o(bang, r, C.J)).replace(/\s+/g, ' ').trim();
        if (!nt) { them(ten, 'J' + r, 'Thiếu người tuyển dụng.', 'Điền tên người tuyển.'); dongLoi = true; }
        if (dongLoi) continue;
        var d = { trang: ten, dong: r, ma_tinh_luong: ma, cccd: cD || cE, ho_ten: String(o(bang, r, C.F)).replace(/\s+/g, ' ').trim(),
                  nguoi_tuyen: nt, gio: Math.round(gio * 10000) / 10000, dat: dat === 'dat' ? true : dat === 'khong dat' ? false : null };
        var t = tinhDong(d);
        d.tinh_trang = t.tinh_trang; d.ly_do = t.ly_do;
        dong.push(d);
      }
    });

    // Trùng khoá CCCD + nhà máy + người tuyển → lỗi cả hai dòng (không tự cộng, không chọn dòng cuối)
    var theoKhoa = {};
    dong.forEach(function (d) {
      if (!d.cccd) return;
      var k = d.cccd + '|' + chuanMa(d.ma_tinh_luong) + '|' + chuanChu(d.nguoi_tuyen);
      (theoKhoa[k] = theoKhoa[k] || []).push(d);
    });
    Object.keys(theoKhoa).forEach(function (k) {
      var g = theoKhoa[k];
      if (g.length < 2) return;
      g.forEach(function (d) {
        them(d.trang, 'F' + d.dong, 'Người này có ' + g.length + ' dòng cùng nhà máy "' + d.ma_tinh_luong + '" cùng người tuyển "' +
             d.nguoi_tuyen + '" (dòng ' + g.map(function (x) { return x.dong; }).join(', ') + ').', 'Gộp lại thành một dòng.');
      });
    });

    return ketQua(loi, dong, ds);
  }

  /** Tổng: giờ của MỌI dòng (không còn "được tính"); đếm Đạt / Không đạt / chưa rõ / thiếu CCCD. */
  function ketQua(loi, dong, ds) {
    var tong = { so_dong: dong.length, so_dat: 0, so_khong_dat: 0, so_chua_ro: 0, so_thieu_cccd: 0, tong_gio: 0 };
    var nm = {};
    dong.forEach(function (d) {
      var k = chuanMa(d.ma_tinh_luong);
      var n = nm[k] = nm[k] || { ma: d.ma_tinh_luong, so_dong: 0, so_dat: 0, gio: 0 };
      n.so_dong++; n.gio += d.gio; tong.tong_gio += d.gio;
      if (d.tinh_trang === 'dat') { tong.so_dat++; n.so_dat++; }
      else if (d.tinh_trang === 'khong_dat') tong.so_khong_dat++;
      else tong.so_chua_ro++;
      if (!d.cccd) tong.so_thieu_cccd++;
    });
    tong.tong_gio = Math.round(tong.tong_gio * 100) / 100;
    var dsNM = Object.keys(nm).sort().map(function (k) { nm[k].gio = Math.round(nm[k].gio * 100) / 100; return nm[k]; });
    return { ok: !loi.length, loi: loi, dong: dong, tong: tong, nha_may: dsNM, trang: ds };
  }

  goc.DocFileGio = { docFile: docFile, tinhDong: tinhDong, chuanMa: chuanMa, chuanCCCD: chuanCCCD,
                     chuanChu: chuanChu, thangCuaTrang: thangCuaTrang };
})(typeof window !== 'undefined' ? window : globalThis);
