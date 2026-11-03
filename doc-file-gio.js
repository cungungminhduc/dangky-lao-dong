/**
 * ĐỌC FILE GIỜ TUYỂN DỤNG + FILE BẢNG GIÁ (đợt 3a) — HÀM THUẦN, không đụng trình duyệt hay mạng.
 * Đặc tả: tool-tuyendung-zalo/.scratch/gio-tien-tuyen-dung/DAC-TA.md · mẫu: cong-luong-doi-soat/MAU-FILE-GIO.md.
 *
 *   DocFileGio.docFile({ '<tên trang>': [[...], ...] }, { thang: '2026-08', gia: { VHSX: 2500, NGOAITINH: 2000 } })
 *     → { ok, loi: [{trang, o, loi, cach_sua}], dong: [...], tong: {...}, nha_may: [...], trang: [...] }
 *   DocFileGio.docBangGia({ '<tên trang>': [[...]] }) → { ok, loi, gia: [{ ma, ten, don_gia, dong }] }
 *   DocFileGio.tinhDong(dongTho, gia) → dòng đã có tinh_trang / don_gia / tien (máy chủ có bản GIỐNG HỆT: tinhDongGio_)
 *
 * `ok` = không có lỗi chặn. Lỗi chặn = file sai cần kế toán sửa (cột Đạt lỗi, giờ lỗi, chưa có giá…).
 * KHÔNG phải lỗi: không đạt, thiếu CCCD — đó là luật "không tính" (Dương chốt 31/10), dòng vẫn được lưu để báo lại.
 */
(function (goc) {
  'use strict';

  // ---------- chuẩn hoá (giữ GIỐNG HỆT bản trong Code.gs — bộ kiểm so hai bên) ----------

  function boDau(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split('đ').join('d').split('Đ').join('D');
  }
  function chuanChu(v) { return boDau(v).toLowerCase().replace(/\s+/g, ' ').trim(); }
  /** Mã tính lương / mã nhà máy: IN HOA, bỏ dấu, bỏ khoảng trắng ("Ngoại tỉnh" → "NGOAITINH", "FEVC ĐM" → "FEVCDM"). */
  function chuanMa(v) { return boDau(String(v == null ? '' : v).trim()).toUpperCase().replace(/\s+/g, ''); }
  var MA_NGOAI_TINH = 'NGOAITINH';

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
  // U=21 nhà máy, AB=28 xét điều kiện, AN=40 ngoại tỉnh.
  var C = { D: 4, E: 5, F: 6, J: 10, T: 20, U: 21, AB: 28, AN: 40 };
  /** Ô tiêu đề dòng 1 phải chứa — lệch là file khác mẫu, từ chối thay vì đọc nhầm cột. */
  var MOC = [[C.D, 'ma code'], [C.F, 'ho va ten'], [C.J, 'nguoi tuyen dung'], [C.T, 'tong gio'], [C.U, 'ten nha may'],
             [C.AB, 'xet dieu kien'], [C.AN, 'kv1']];
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
   * Một dòng thô (đã đọc từ ô) → áp luật tính. Dùng chung trang + máy chủ (máy chủ có bản giống hệt).
   * Trả { tinh_trang: 'tinh' | 'khong_dat' | 'thieu_cccd', ly_do, don_gia, tien } hoặc { loi } nếu thiếu giá.
   */
  function tinhDong(d, gia) {
    var maGia = d.ngoai_tinh ? MA_NGOAI_TINH : chuanMa(d.ma_tinh_luong);
    var g = gia && Object.prototype.hasOwnProperty.call(gia, maGia) ? Number(gia[maGia]) : null;
    if (!d.cccd) return { tinh_trang: 'thieu_cccd', ly_do: 'Thiếu số CCCD 12 số — không tính', don_gia: g, tien: 0 };
    if (!d.dat) return { tinh_trang: 'khong_dat', ly_do: 'Không đạt — không tính', don_gia: g, tien: 0 };
    if (g == null || !(g > 0)) {
      return { loi: d.ngoai_tinh ? 'Chưa có đơn giá Ngoại tỉnh' : 'Chưa có đơn giá cho nhà máy "' + d.ma_tinh_luong + '"' };
    }
    return { tinh_trang: 'tinh', ly_do: '', don_gia: g, tien: Math.round(d.gio * g) };
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
        var dat = chuanChu(o(bang, r, C.AB));
        if (dat !== 'dat' && dat !== 'khong dat') {
          them(ten, 'AB' + r, trong(o(bang, r, C.AB)) ? 'Cột Đạt đang trống hoặc lỗi công thức.'
                              : 'Cột Đạt đang là "' + String(o(bang, r, C.AB)).substring(0, 20) + '" (cần DAT hoặc KHONG DAT).',
               'Cột Đạt đọc công thức từ file khác — chọn cả cột, Sao chép, Dán đặc biệt → Chỉ giá trị (Values), lưu rồi tải lại.');
          dongLoi = true;
        }
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
        dong.push({ trang: ten, dong: r, ma_tinh_luong: ma, cccd: cD || cE, ho_ten: String(o(bang, r, C.F)).replace(/\s+/g, ' ').trim(),
                    nguoi_tuyen: nt, gio: Math.round(gio * 10000) / 10000, dat: dat === 'dat', ngoai_tinh: !trong(o(bang, r, C.AN)) });
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

    // Áp giá — thiếu giá báo MỘT lỗi cho mỗi nhà máy (không phải trăm dòng giống nhau)
    var thieuGia = {};
    dong.forEach(function (d) {
      var t = tinhDong(d, tc.gia || {});
      if (t.loi) { (thieuGia[t.loi] = thieuGia[t.loi] || []).push(d.trang + ' dòng ' + d.dong); return; }
      d.tinh_trang = t.tinh_trang; d.ly_do = t.ly_do; d.don_gia = t.don_gia; d.tien = t.tien;
    });
    Object.keys(thieuGia).forEach(function (cau) {
      them('', '', cau + ' (' + thieuGia[cau].length + ' dòng, vd ' + thieuGia[cau][0] + ').',
           'Thêm giá ở mục 💲 Bảng giá tuyển dụng rồi chọn lại file.');
    });
    return ketQua(loi, dong, ds);
  }

  function ketQua(loi, dong, ds) {
    var tong = { so_dong: dong.length, so_tinh: 0, so_khong_dat: 0, so_thieu_cccd: 0, tong_gio: 0, tong_tien: 0 };
    var nm = {};
    dong.forEach(function (d) {
      var k = chuanMa(d.ma_tinh_luong);
      var n = nm[k] = nm[k] || { ma: d.ma_tinh_luong, so_dong: 0, so_tinh: 0, gio: 0, tien: 0 };
      n.so_dong++;
      if (d.tinh_trang === 'tinh') { tong.so_tinh++; tong.tong_gio += d.gio; tong.tong_tien += d.tien; n.so_tinh++; n.gio += d.gio; n.tien += d.tien; }
      else if (d.tinh_trang === 'khong_dat') tong.so_khong_dat++;
      else if (d.tinh_trang === 'thieu_cccd') tong.so_thieu_cccd++;
    });
    tong.tong_gio = Math.round(tong.tong_gio * 100) / 100;
    var dsNM = Object.keys(nm).sort().map(function (k) { nm[k].gio = Math.round(nm[k].gio * 100) / 100; return nm[k]; });
    return { ok: !loi.length, loi: loi, dong: dong, tong: tong, nha_may: dsNM, trang: ds };
  }

  // ---------- file bảng giá ----------

  /**
   * Trang đầu tiên của file: cột A = mã tính lương (đúng chữ cột "Tên nhà máy làm việc" của file giờ, hoặc "Ngoại tỉnh"),
   * cột B = đơn giá (đồng / giờ). Dòng tiêu đề (cột B không phải số) được bỏ qua.
   */
  function docBangGia(cacTrang) {
    var loi = [], gia = [], daCo = {};
    var ten = Object.keys(cacTrang || {})[0];
    if (!ten) return { ok: false, loi: [{ trang: '', o: '', loi: 'File không có trang nào.', cach_sua: '' }], gia: [] };
    var bang = cacTrang[ten];
    for (var r = 1; r <= bang.length; r++) {
      var ma = String(o(bang, r, 1) == null ? '' : o(bang, r, 1)).trim(), vg = o(bang, r, 2);
      if (!ma && trong(vg)) continue;
      var g = so(vg);
      if (g == null || isNaN(g)) {
        if (r <= 3 && !gia.length) continue;                       // dòng tiêu đề
        loi.push({ trang: ten, o: 'B' + r, loi: 'Đơn giá của "' + ma + '" không phải số.', cach_sua: 'Ghi số đồng / giờ, vd 2500.' });
        continue;
      }
      if (!ma) { loi.push({ trang: ten, o: 'A' + r, loi: 'Thiếu mã nhà máy.', cach_sua: 'Ghi đúng tên nhà máy như cột U của file giờ.' }); continue; }
      if (!(g > 0)) { loi.push({ trang: ten, o: 'B' + r, loi: 'Đơn giá phải lớn hơn 0.', cach_sua: '' }); continue; }
      var k = chuanMa(ma);
      if (daCo[k]) { loi.push({ trang: ten, o: 'A' + r, loi: '"' + ma + '" có 2 dòng (dòng ' + daCo[k] + ' và ' + r + ').', cach_sua: 'Để một dòng.' }); continue; }
      daCo[k] = r;
      gia.push({ ma: k, ten: ma, don_gia: g, dong: r });
    }
    if (!gia.length && !loi.length) loi.push({ trang: ten, o: '', loi: 'Không đọc được dòng giá nào.', cach_sua: 'Cột A mã nhà máy, cột B đơn giá.' });
    return { ok: !loi.length, loi: loi, gia: gia };
  }

  goc.DocFileGio = { docFile: docFile, docBangGia: docBangGia, tinhDong: tinhDong, chuanMa: chuanMa, chuanCCCD: chuanCCCD,
                     chuanChu: chuanChu, thangCuaTrang: thangCuaTrang, MA_NGOAI_TINH: MA_NGOAI_TINH };
})(typeof window !== 'undefined' ? window : globalThis);
