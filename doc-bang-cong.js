/**
 * ĐỌC BẢNG CÔNG (luồng "lương chạy từ bảng công", vé 03) — HÀM THUẦN, không đụng trình duyệt hay mạng.
 * Cần nạp doc-file-luong.js TRƯỚC (dùng chung chuẩn hoá + bố cục trang Chấm công, tìm cột theo CHỮ TIÊU ĐỀ).
 *
 *   DocBangCong.docBangCong({ '<tên trang>': [[...], ...], ... }, { ky: '2026-09' })
 *     → { ok, loi: [{trang, o, loi, cach_sua}], canh_bao: [...], nguoi: [...], thong_tin: { trang, dang, ky, so_nguoi, ma_ct_file, dia_ban } }
 *
 * Đọc được bảng công nhà máy (BCNB: trang "1.Chấm công …" hoặc "Chấm công T.09") lẫn trang "1.Chấm công" của file lương 334.
 * Công ty lấy theo Ô ĐÃ CHỌN trên lưới; tên trang ("VHSX T8"), ô địa bàn, cột MÃ CÔNG TY ("YU") KHÔNG làm đổi công ty hay kỳ.
 * Kỳ = tháng của ngày cuối kỳ công. 8 cột đếm (NP, KP, LĐ, NV, NN, CV, CG, TSA) là CHUẨN (Dương chốt 06/11/2026): máy đọc số
 * trong ô, không đếm lại từ ô ngày. Mỗi người (CCCD nhà máy) ra cùng dạng `nguoi[i]` của DocFileLuong, chỉ thiếu phần lương.
 */
(function (goc) {
  'use strict';

  var F = goc.DocFileLuong;
  if (!F || !F.coBan) throw new Error('doc-bang-cong.js cần nạp doc-file-luong.js trước');
  var K = F.coBan, o = K.o, so = K.so, tron = K.tron, trong = K.trong, chuanChu = K.chuanChu, tenO = F.tenO;

  /** Mã ca mỗi dạng. Dạng B (có cột "Giờ ca", mẫu IMT) chia đêm theo khung giờ. */
  var MA_CA = {
    A: ['HCN', 'TCN', 'HCD', 'TCD', 'TCCN', 'TCDCN', 'TCNL', 'TCDNL'],
    B: ['HCN', 'TCN', 'CD20-22', 'CD22-5', 'CD5-6', 'CD6-8', 'TCCN', 'TCDCN', 'TCNL', 'TCDNL']
  };
  /** Chữ được ghi trong ô ngày (hoa hay thường đều nhận — Excel không phân biệt; file MT có "np", "cv"). NL = nghỉ lễ. */
  var KY_HIEU = ['NP', 'KP', 'LĐ', 'NV', 'NN', 'CV', 'CG', 'NL'];
  /** [khoá, chữ viết tắt, tên đầy đủ] — tiêu đề có thể là chữ viết tắt hoặc tên đầy đủ, ở dòng trên / trong / dưới dòng tiêu đề. */
  var COT_DEM = [['np', 'NP', 'Nghỉ phép'], ['kp', 'KP', 'Không phép'], ['ld', 'LĐ', 'Lưu động'], ['nv', 'NV', 'Nghỉ việc'],
                 ['nn', 'NN', 'Nghỉ ngang'], ['cv', 'CV', 'Chờ việc'], ['cg', 'CG', 'Cắt giảm'], ['tsa', 'TSA', 'Tổng suất ăn']];
  var CACH_SUA_O_NGAY = 'Chỉ ghi số giờ, hoặc một trong: ' + KY_HIEU.join(', ') + '.';

  function timTrangCC(cacTrang, chan) {
    var ten = Object.keys(cacTrang).filter(function (t) { return chuanChu(t).indexOf('cham cong') >= 0; });
    if (ten.length > 1) {
      ten = ten.filter(function (t) {
        for (var r = 1; r <= 12; r++) if (K.timCot(cacTrang[t] || [], [r], K.baoGom('cccd nha may'))) return true;
        return false;
      });
    }
    if (!ten.length) chan('', '', 'Không thấy trang chấm công.', 'Chọn đúng file bảng công (có trang tên "Chấm công …").');
    else if (ten.length > 1) chan('', '', 'File có ' + ten.length + ' trang chấm công: ' + ten.join(', ') + '.', 'Chỉ để lại MỘT trang chấm công của tháng này rồi chọn file lần nữa.');
    return ten.length === 1 ? ten[0] : '';
  }

  var docNgay = K.docNgay;

  function docBangCong(cacTrang, tuyChon) {
    tuyChon = tuyChon || {};
    var loi = [], canhBao = [], chan = K.taoChan(loi, cacTrang);   // 2.4.0 vé 03: lỗi ở một ô kèm chữ đang ghi để sửa ngay trên trang
    function bao(trang, oTen, cau) { canhBao.push({ trang: trang, o: oTen, loi: cau }); }
    var kq = { ok: false, loi: loi, canh_bao: canhBao, nguoi: [], thong_tin: {} };

    var t = timTrangCC(cacTrang, chan);
    if (!t) return kq;
    var cc = cacTrang[t] || [];
    var bc = K.boCucChamCong(cc, t, chan);
    if (loi.length) return kq;
    var dongTD = bc.dong_ngay - 1, ba = [dongTD - 1, dongTD, dongTD + 1];
    var dang = K.timCot(cc, [dongTD, dongTD + 1], K.dungChu('gio ca'), 1, bc.cot_ngay - 1) ? 'B' : 'A';
    bc.vao = K.timCot(cc, [dongTD, dongTD + 1], K.baoGom('ngay vao'));
    if (!bc.vao) chan(t, '', 'Không thấy cột "NGÀY VÀO".', 'Giữ nguyên chữ tiêu đề các cột trên trang chấm công.');
    var dem = COT_DEM.map(function (x) {
      var cot = K.timCot(cc, ba, function (s) { return s === chuanChu(x[1]) || s.indexOf(chuanChu(x[2])) >= 0; }, bc.tong + 1);
      if (!cot) chan(t, '', 'Không thấy cột đếm "' + x[2] + '" (' + x[1] + ').', 'Bảng công phải có đủ 8 cột đếm ' +
                     COT_DEM.map(function (y) { return y[1]; }).join(', ') + ' sau cột Tổng giờ công — thêm lại cột này, giữ đúng chữ tiêu đề.');
      return { khoa: x[0], viet: x[1], cot: cot };
    });
    if (loi.length) return kq;
    kq.thong_tin.trang = t;
    kq.thong_tin.dang = dang;

    // --- ngày của bảng công; KỲ = tháng của ngày cuối kỳ công ---
    var ngay = [];
    for (var j = 0; j < bc.so_ngay; j++) ngay.push(F.ngayExcel(o(cc, bc.dong_ngay, bc.cot_ngay + j)));
    var ngayCuoi = ngay.filter(function (x) { return x; }).sort().pop();
    var kyFile = ngayCuoi.substring(0, 7);
    kq.thong_tin.ky = kyFile;
    if (tuyChon.ky && kyFile !== tuyChon.ky) {
      chan(t, tenO(bc.dong_ngay, bc.cot_ngay + bc.so_ngay - 1), 'Bảng công là kỳ ' + K.thangDep(kyFile) + ', ô anh/chị chọn là kỳ ' +
           K.thangDep(tuyChon.ky) + '.', 'Chọn đúng ô tháng trên lưới, hoặc chọn đúng file.', { loai: 'thang', ky_file: kyFile });
    }
    (cc[dongTD - 1] || []).forEach(function (v, i) {        // "NGÀY TRONG THÁNG 8/2026" mà ngày cuối là 26/09 → chỉ nhắc
      var m = /ngay trong thang\s*(\d{1,2})\s*\/\s*(\d{4})/.exec(chuanChu(v));
      if (m && m[2] + '-' + ('0' + Number(m[1])).slice(-2) !== kyFile) {
        bao(t, tenO(dongTD, i + 1), 'Ô ' + tenO(dongTD, i + 1) + ' ghi tháng ' + Number(m[1]) + '/' + m[2] + ', nhưng ngày cuối bảng công là ' +
            ngayCuoi.substring(8) + '/' + ngayCuoi.substring(5, 7) + '/' + ngayCuoi.substring(0, 4) + ' — máy lấy kỳ ' + K.thangDep(kyFile) + '.');
      }
    });
    for (var d = 1; d < dongTD; d++) {
      var dbm = /^\s*[dđ][iị]a b[aà]n\s*:\s*(.*)$/i.exec(String(o(cc, d, 1) || ''));
      if (dbm) kq.thong_tin.dia_ban = dbm[1].trim();
    }

    // --- từng dòng: gom theo CCCD nhà máy ---
    var theoCCCD = {}, thuTu = [], maCTFile = {}, maCa = MA_CA[dang];
    var tatCaMa = MA_CA.A.concat(MA_CA.B);
    function coGio(r) {
      for (var k = 0; k < bc.so_ngay; k++) { var v = o(cc, r, bc.cot_ngay + k); if (!trong(v) && v !== 0) return true; }
      return false;
    }
    for (var r = bc.dau; r <= cc.length; r++) {
      var cRaw = o(cc, r, bc.cccd);
      var ma = String(o(cc, r, bc.ca) == null ? '' : o(cc, r, bc.ca)).trim().toUpperCase();
      if (trong(cRaw) || cRaw === 0 || cRaw === '0') {
        // dòng khuôn trống (có mã ca, không CCCD) thì bỏ — nhưng có giờ mà thiếu CCCD là giờ của ai đó sắp mất lặng lẽ
        if (tatCaMa.indexOf(ma) >= 0 && coGio(r)) {
          chan(t, tenO(r, bc.cccd), 'Dòng ' + r + ' có giờ công mà không có CCCD nhà máy.', 'Điền CCCD nhà máy cho dòng này, hoặc xoá giờ nếu là dòng thừa.');
        }
        continue;
      }
      var cNM = F.chuanSoGiayTo(cRaw);
      if (!cNM) { chan(t, tenO(r, bc.cccd), 'Số CCCD nhà máy không hợp lệ.', 'Cần 12 số CCCD (hoặc 9 số CMND).'); continue; }
      if (bc.ma_ct && !trong(o(cc, r, bc.ma_ct))) { var tenMa = String(o(cc, r, bc.ma_ct)).trim(); if (!maCTFile[tenMa]) maCTFile[tenMa] = tenO(r, bc.ma_ct); }
      var ng = theoCCCD[cNM];
      if (!ng) {
        var fRaw = o(cc, r, bc.cccd_thuc), cThuc = trong(fRaw) || fRaw === 0 ? '' : F.chuanSoGiayTo(fRaw);
        if (!trong(fRaw) && fRaw !== 0 && !cThuc) chan(t, tenO(r, bc.cccd_thuc), 'Số CCCD thực không hợp lệ.', 'Cần 12 số CCCD (hoặc 9 số CMND), hoặc để trống.');
        var tenNM = String(o(cc, r, bc.ten) || '').replace(/\s+/g, ' ').trim();
        var tenThuc = String(o(cc, r, bc.ten_thuc) || '').replace(/\s+/g, ' ').trim();
        if (!tenNM && !tenThuc) chan(t, tenO(r, bc.ten), 'Thiếu họ tên.', 'Điền họ và tên nhà máy (hoặc họ và tên thực).');
        var vRaw = o(cc, r, bc.vao), vao = docNgay(vRaw);
        if (!vao) {
          chan(t, tenO(r, bc.vao), trong(vRaw) ? 'Thiếu ngày vào.' : 'Ngày vào "' + String(vRaw).trim() + '" không đọc được.',
               'Gõ ngày vào làm (vd 05/09/2026) — máy cần ngày này để biết người mới hay cũ, tính thâm niên.');
        }
        ng = theoCCCD[cNM] = { dong: r, cccd_nha_may: cNM, ten_nha_may: tenNM, cccd_tra: cThuc || cNM, ten_hien: tenThuc || tenNM,
                               nguoi_tuyen: String(o(cc, r, bc.tuyen) || '').trim(), ngay_vao: vao, tt: K.thongTinNguoi(cc, r, bc), ca: [], nghi: {} };
        dem.forEach(function (x) {                            // cột đếm ở dòng đầu mỗi người là chuẩn — đọc số, không đếm lại
          var v = o(cc, r, x.cot), n = so(v);
          if (n !== null && isNaN(n)) chan(t, tenO(r, x.cot), 'Ô đếm ' + x.viet + ' ghi "' + String(v).trim() + '", cần số.', 'Gõ số (vd 2); không có thì để trống.');
          else if (n) ng.nghi[x.khoa] = tron(n, 2);
        });
        thuTu.push(cNM);
      }
      if (!ma) { chan(t, tenO(r, bc.ca), 'Ô Ca trống.', 'Ghi mã ca: ' + maCa.join(', ') + '.'); continue; }
      if (maCa.indexOf(ma) < 0) {
        chan(t, tenO(r, bc.ca), 'Mã ca "' + ma + '" lạ với bảng công dạng ' + dang + (dang === 'B' ? ' (có cột Giờ ca)' : '') + '.',
             'Chỉ dùng: ' + maCa.join(', ') + '.');
        continue;
      }
      var trung = ng.ca.filter(function (x) { return x.ma === ma; })[0];
      if (trung) { chan(t, tenO(r, bc.ca), 'Người này đã có dòng ca ' + ma + ' ở dòng ' + trung.dong + '.', 'Mỗi mã ca một dòng — gộp hoặc xoá dòng lặp.'); continue; }
      var gio = [], coNgay = false;
      for (var k = 0; k < bc.so_ngay; k++) {
        var c = bc.cot_ngay + k, v = o(cc, r, c), n = so(v);
        if (n === null) { gio.push(null); continue; }
        if (isNaN(n)) {
          var s = String(v).trim();
          if (KY_HIEU.map(chuanChu).indexOf(chuanChu(s)) < 0) chan(t, tenO(r, c), 'Chữ "' + s + '" trong ô ngày không phải ký hiệu nghỉ.', CACH_SUA_O_NGAY);
          gio.push(s); coNgay = true;                       // giữ nguyên chữ để hiện đúng như file
          continue;
        }
        if (n < 0 || n > 24) chan(t, tenO(r, c), 'Ô ngày ghi ' + n + ' giờ.', 'Một ngày chỉ từ 0 đến 24 giờ — sửa lại số giờ.');
        gio.push(tron(n, 2)); if (n) coNgay = true;
      }
      var tongCa = so(o(cc, r, bc.tong));
      if (tongCa !== null && isNaN(tongCa)) chan(t, tenO(r, bc.tong), 'Tổng giờ công không phải số.', 'Kiểm công thức ô tổng giờ.');
      ng.ca.push({ dong: r, ma: ma, ten: K.TEN_CA[ma] || ma, gio: gio, tong: tongCa === null || isNaN(tongCa) ? null : tron(tongCa, 2), co_ngay: coNgay });
    }

    var dsNguoi = thuTu.map(function (c) {
      var n = theoCCCD[c];
      return {
        cccd_tra: n.cccd_tra, ten_tra: F.bienTheTen(n.ten_hien), ten_hien: n.ten_hien,
        cccd_nha_may: n.cccd_nha_may, ten_nha_may: n.ten_nha_may, nguoi_tuyen: n.nguoi_tuyen, ngay_vao: n.ngay_vao,
        so_code: n.tt.so_code, ngay_sinh: n.tt.ngay_sinh, ngay_nghi: n.tt.ngay_nghi,
        cong: { ngay: ngay, co_chi_tiet: n.ca.some(function (x) { return x.co_ngay; }),
                ca: n.ca.map(function (x) { return { ma: x.ma, ten: x.ten, gio: x.gio, tong: x.tong }; }), nghi: n.nghi }
      };
    });
    var cacTra = {};
    dsNguoi.forEach(function (n) {
      if (cacTra[n.cccd_tra]) bao(t, '', 'Hai hồ sơ nhà máy cùng một CCCD thực (' + n.ten_hien + ') — người đó tra sẽ thấy cả hai bảng công.');
      cacTra[n.cccd_tra] = true;
    });
    K.nhacThieuSinh(dsNguoi, t, bao);
    if (!dsNguoi.length && !loi.length) chan(t, '', 'Bảng công không có người nào.', 'Kiểm file đã điền CCCD nhà máy chưa.');
    // 2.4.0 vé 04: bảng công nay cũng xét công ty (trước chỉ theo ô đã chọn) — khớp Tên công ty / Mã / Tên chạy lương cũ. File không có cột công ty thì không xét
    var dsTen = Object.keys(maCTFile);
    if (tuyChon.ma_ct && dsTen.length && (dsTen.length > 1 || !K.khopCongTy(dsTen[0], tuyChon))) {
      var sct = K.cauSaiCongTy(dsTen, tuyChon);
      chan(t, maCTFile[dsTen[0]], sct[0], sct[1], { loai: 'cong_ty', ma_file: dsTen.length === 1 ? dsTen[0] : '' });
    }
    kq.nguoi = dsNguoi;
    kq.thong_tin.so_nguoi = dsNguoi.length;
    kq.thong_tin.ma_ct_file = Object.keys(maCTFile).join(', ');
    kq.ok = !loi.length;
    return kq;
  }

  goc.DocBangCong = { docBangCong: docBangCong, MA_CA: MA_CA, KY_HIEU: KY_HIEU };
})(typeof window !== 'undefined' ? window : globalThis);
