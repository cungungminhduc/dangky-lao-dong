/**
 * ĐỌC FILE TẠM ỨNG, LƯU ĐỘNG, GHI CHÚ (luồng "lương chạy từ bảng công", vé 06, đặc tả mục 7) — HÀM THUẦN, không đụng trình duyệt hay mạng.
 * Cần nạp doc-file-luong.js TRƯỚC (dùng chung chuẩn hoá + tìm cột theo CHỮ TIÊU ĐỀ).
 *
 *   DocTamUng.docFile({ '<tên trang>': [[...], ...], ... }, { nguoi: [{ cccd_nha_may, cccd_tra, ten_hien }, ...] })
 *     → { ok, loi: [{trang, o, loi, cach_sua}], canh_bao: [{trang, o, loi}], nguoi: [{ cccd_nha_may, ten_hien, tam_ung, luu_dong, giam_tru_khac, ghi_chu }],
 *         thong_tin: { co_tam_ung, co_luu_dong, co_ghi_chu, so_nguoi, tong_tam_ung, tong_luu_dong, tong_giam_tru, dong_bo_qua, tien_bo_qua } }
 *
 * `tuyChon.nguoi` = người trong bảng công đã chốt. Một người nhiều dòng → cộng dồn. Không có trang nào → không có khoản đó (báo, không chặn).
 * Có trang mà thiếu cột → chặn, nêu đúng trang + cột. CCCD lạ → chặn đúng dòng, trừ dòng TẠM ỨNG có chữ ở "Số tiền đã quyết toán" (đã hoàn tiền về): bỏ qua, báo số dòng.
 */
(function (goc) {
  'use strict';

  var F = goc.DocFileLuong;
  if (!F || !F.coBan) throw new Error('doc-file-tam-ung.js cần nạp doc-file-luong.js trước');
  var K = F.coBan, o = K.o, so = K.so, trong = K.trong, chuanChu = K.chuanChu, timCot = K.timCot, baoGom = K.baoGom, tenO = F.tenO;
  var TRAN_GHI_CHU = 200;

  /** Trang có tên chứa chữ `chu` (so sau chuẩn hoá: tên trang "TẠM ỨNG" ở file IMT là dạng NFD). */
  function timTrang(cacTrang, chu) { return Object.keys(cacTrang).filter(function (t) { return chuanChu(t).indexOf(chu) >= 0; }); }
  /** Dòng đầu (1–12) có ô khớp. Không có → 0. */
  function dongCo(bang, khop) {
    for (var r = 1; r <= 12; r++) if (timCot(bang, [r], khop)) return r;
    return 0;
  }
  function tuMot(n) { var ra = []; for (var i = 1; i <= n; i++) ra.push(i); return ra; }

  function docFile(cacTrang, tuyChon) {
    var loi = [], canhBao = [];
    function chan(trang, oTen, cau, cachSua) { loi.push({ trang: trang, o: oTen, loi: cau, cach_sua: cachSua || '' }); }
    function bao(trang, oTen, cau) { canhBao.push({ trang: trang, o: oTen, loi: cau }); }

    // --- người trong bảng công đã chốt: khớp CCCD nhà máy hoặc CCCD thực ---
    var theoNM = {}, theoTra = {};
    ((tuyChon && tuyChon.nguoi) || []).forEach(function (n) {
      var x = { cccd_nha_may: n.cccd_nha_may, ten_hien: n.ten_hien, tam_ung: 0, luu_dong: 0, giam_tru_khac: 0, ghi_chu: '', co: false };
      theoNM[n.cccd_nha_may] = x;
      (theoTra[n.cccd_tra] = theoTra[n.cccd_tra] || []).push(x);
    });
    /** Trả người, hoặc null nếu CCCD không có. Hai hồ sơ cùng CCCD thực → vào hồ sơ đầu, có báo. */
    function tim(c, trang, oTen) {
      if (theoNM[c]) return theoNM[c];
      var ds = theoTra[c];
      if (!ds) return null;
      if (ds.length > 1) bao(trang, oTen, 'CCCD thực này có ' + ds.length + ' hồ sơ nhà máy (' + ds[0].ten_hien + '): khoản này tính vào hồ sơ đầu.');
      return ds[0];
    }
    function moi(r) { return !trong(r) && r !== 0 && r !== '0'; }
    var CACH_SUA_CCCD = 'Kiểm số CCCD: phải trùng CCCD nhà máy hoặc CCCD thực trong bảng công đã chốt.';
    /** Một dòng có tiền: ô tiền đọc được, có CCCD. Trả { c, tien } hoặc null nếu dòng này không có gì để tính. */
    function docDong(t, bang, r, cCCCD, cTien) {
      var raw = o(bang, r, cCCCD), tien = so(o(bang, r, cTien));
      if (tien !== null && isNaN(tien)) { chan(t, tenO(r, cTien), 'Ô số tiền không phải số.', 'Sửa ô này thành số.'); return null; }
      if (!moi(raw)) {
        if (tien) bao(t, tenO(r, cTien), 'Dòng ' + r + ' có số tiền nhưng không có CCCD: không tính.');
        return null;
      }
      return tien ? { c: F.chuanSoGiayTo(raw), tien: tien } : null;
    }

    var tt = { co_tam_ung: false, co_luu_dong: false, co_ghi_chu: false, dong_bo_qua: 0, tien_bo_qua: 0 };

    // --- TẠM ỨNG: CCCD ở "Mã code Minh Đức" (MT) hoặc "Mã code Nơi LV" (IMT) ---
    timTrang(cacTrang, 'tam ung').slice(0, 1).forEach(function (t) {
      tt.co_tam_ung = true;
      var b = cacTrang[t], rT = dongCo(b, baoGom('so tien duoc ung'));
      if (!rT) { chan(t, '', 'Thiếu cột "Số tiền được ứng".', 'Giữ đúng chữ tiêu đề cột.'); return; }
      var cTien = timCot(b, [rT], baoGom('so tien duoc ung')), cQT = timCot(b, [rT], baoGom('da quyet toan'));
      var dongs = tuMot(rT), cCCCD = timCot(b, dongs, baoGom('ma code minh duc')) || timCot(b, dongs, baoGom('ma code noi lv'));
      if (!cCCCD) { chan(t, '', 'Thiếu cột CCCD ("Mã code Minh Đức" hoặc "Mã code Nơi LV").', 'Giữ đúng chữ tiêu đề cột.'); return; }
      for (var r = rT + 1; r <= b.length; r++) {
        var d = docDong(t, b, r, cCCCD, cTien);
        if (!d) continue;
        var qt = cQT ? o(b, r, cQT) : null, daQT = typeof qt === 'string' && qt.trim() !== '';
        var ng = tim(d.c, t, tenO(r, cCCCD));
        if (!ng) {
          if (daQT) { tt.dong_bo_qua++; tt.tien_bo_qua += d.tien; continue; }
          chan(t, tenO(r, cCCCD), 'Dòng ' + r + ': CCCD này không có trong bảng công đã chốt.', CACH_SUA_CCCD + ' Tiền đã hoàn về thì ghi chữ vào ô "Số tiền đã quyết toán".');
          continue;
        }
        if (daQT) bao(t, tenO(r, cQT), 'Dòng ' + r + ' (' + ng.ten_hien + ') có chữ ở "Số tiền đã quyết toán" mà vẫn trong bảng công: vẫn trừ khoản này, kiểm lại.');
        ng.tam_ung += d.tien; ng.co = true;
      }
    });

    // --- TH-LƯU ĐỘNG ---
    timTrang(cacTrang, 'luu dong').slice(0, 1).forEach(function (t) {
      tt.co_luu_dong = true;
      var b = cacTrang[t], laCCCD = function (s) { return s === 'ma cccd'; }, laTien = function (s) { return s === 'tong tien'; };
      var rC = dongCo(b, laCCCD), rT = dongCo(b, laTien);
      if (!rC) chan(t, '', 'Thiếu cột "Mã CCCD".', 'Giữ đúng chữ tiêu đề cột.');
      if (!rT) chan(t, '', 'Thiếu cột "tổng tiền".', 'Giữ đúng chữ tiêu đề cột.');
      if (!rC || !rT) return;
      var cCCCD = timCot(b, [rC], laCCCD), cTien = timCot(b, [rT], laTien);
      for (var r = Math.max(rC, rT) + 1; r <= b.length; r++) {
        var d = docDong(t, b, r, cCCCD, cTien);
        if (!d) continue;
        var ng = tim(d.c, t, tenO(r, cCCCD));
        if (!ng) { chan(t, tenO(r, cCCCD), 'Dòng ' + r + ': CCCD này không có trong bảng công đã chốt.', CACH_SUA_CCCD); continue; }
        ng.luu_dong += d.tien; ng.co = true;
      }
    });

    // --- GHI CHÚ (trang mới): CCCD · Giảm trừ khác · Ghi chú ---
    timTrang(cacTrang, 'ghi chu').slice(0, 1).forEach(function (t) {
      tt.co_ghi_chu = true;
      var b = cacTrang[t], rC = dongCo(b, baoGom('cccd')), thieu = 0;
      if (!rC) chan(t, '', 'Thiếu cột "CCCD".', 'Trang GHI CHÚ cần 3 cột: CCCD, Giảm trừ khác, Ghi chú.');
      var cCCCD = rC ? timCot(b, [rC], baoGom('cccd')) : 0, cGiam = rC ? timCot(b, [rC], baoGom('giam tru khac')) : 0, cGhi = rC ? timCot(b, [rC], baoGom('ghi chu')) : 0;
      if (rC && !cGiam) { chan(t, '', 'Thiếu cột "Giảm trừ khác".', 'Trang GHI CHÚ cần 3 cột: CCCD, Giảm trừ khác, Ghi chú.'); thieu++; }
      if (rC && !cGhi) { chan(t, '', 'Thiếu cột "Ghi chú".', 'Trang GHI CHÚ cần 3 cột: CCCD, Giảm trừ khác, Ghi chú.'); thieu++; }
      if (!rC || thieu) return;
      for (var r = rC + 1; r <= b.length; r++) {
        var raw = o(b, r, cCCCD), giam = so(o(b, r, cGiam)), ghi = String(o(b, r, cGhi) == null ? '' : o(b, r, cGhi)).trim();
        if (giam !== null && isNaN(giam)) { chan(t, tenO(r, cGiam), 'Ô giảm trừ khác không phải số.', 'Sửa ô này thành số.'); continue; }
        if (!moi(raw)) { if (giam || ghi) bao(t, tenO(r, cCCCD), 'Dòng ' + r + ' có nội dung nhưng không có CCCD: không tính.'); continue; }
        if (!giam && !ghi) continue;
        var ng = tim(F.chuanSoGiayTo(raw), t, tenO(r, cCCCD));
        if (!ng) { chan(t, tenO(r, cCCCD), 'Dòng ' + r + ': CCCD này không có trong bảng công đã chốt.', CACH_SUA_CCCD); continue; }
        ng.giam_tru_khac += giam || 0;
        if (ghi) ng.ghi_chu = (ng.ghi_chu ? ng.ghi_chu + '; ' : '') + ghi;
        ng.co = true;
      }
    });

    var kq = { ok: !loi.length, loi: loi, canh_bao: canhBao, nguoi: [], thong_tin: tt };
    if (!tt.co_tam_ung && !tt.co_luu_dong && !tt.co_ghi_chu) {
      bao('', '', 'File không có trang TẠM ỨNG, TH-LƯU ĐỘNG hay GHI CHÚ: lưu thì coi như tháng này không có khoản trừ nào.');
    }
    if (tt.dong_bo_qua) {
      bao('TẠM ỨNG', '', 'Đã bỏ qua ' + tt.dong_bo_qua + ' dòng (' + tt.tien_bo_qua.toLocaleString('vi-VN') + ' đ) có chữ ở "Số tiền đã quyết toán" và người không còn trong bảng công.');
    }
    tt.tong_tam_ung = 0; tt.tong_luu_dong = 0; tt.tong_giam_tru = 0;
    Object.keys(theoNM).forEach(function (c) {
      var x = theoNM[c];
      if (!x.co) return;
      tt.tong_tam_ung += x.tam_ung; tt.tong_luu_dong += x.luu_dong; tt.tong_giam_tru += x.giam_tru_khac;
      kq.nguoi.push({ cccd_nha_may: x.cccd_nha_may, ten_hien: x.ten_hien, tam_ung: x.tam_ung, luu_dong: x.luu_dong, giam_tru_khac: x.giam_tru_khac,
                      ghi_chu: x.ghi_chu.substring(0, TRAN_GHI_CHU) });
    });
    tt.so_nguoi = kq.nguoi.length;
    return kq;
  }

  goc.DocTamUng = { docFile: docFile };
})(typeof window !== 'undefined' ? window : globalThis);
