/**
 * ĐỌC FILE LƯƠNG theo chữ tiêu đề (đọc được cả dạng A và B, chèn thêm cột không hỏng) — HÀM THUẦN, không đụng trình duyệt hay mạng.
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
  /** "C91" → { dong: 91, cot: 3 }; không phải địa chỉ đúng một ô → null. */
  function diaChiO(oTen) {
    var m = /^([A-Z]{1,3})(\d+)$/.exec(String(oTen || '').trim());
    if (!m) return null;
    var c = 0;
    m[1].split('').forEach(function (x) { c = c * 26 + x.charCodeAt(0) - 64; });
    return { dong: Number(m[2]), cot: c };
  }
  /**
   * 2.4.0 vé 03 — hàm ghi LỖI CHẶN dùng chung hai bộ đọc. Lỗi nằm ở đúng một ô thì kèm `dang_ghi` (chữ đang có trong ô) để trang hiện ô sửa ngay;
   * `them` = trường riêng của loại lỗi (loai: 'thang' + ky_file · 'cong_ty' + ma_file · 'tong' + tong_may, tong_file).
   */
  function taoChan(loi, cacTrang) {
    return function (trang, oTen, cau, cachSua, them) {
      var x = { trang: trang, o: oTen, loi: cau, cach_sua: cachSua || '' }, dc = trang ? diaChiO(oTen) : null;
      if (dc && cacTrang[trang]) { var v = o(cacTrang[trang], dc.dong, dc.cot); x.dang_ghi = v == null ? '' : String(v); }
      if (them) Object.keys(them).forEach(function (k) { x[k] = them[k]; });
      loi.push(x);
    };
  }
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

  // ---------- bố cục: tìm cột theo CHỮ TIÊU ĐỀ, không theo chữ cái cột ----------
  // File thật có hai dạng cùng tồn tại (A: YUWON, MT · B: IMT nhiều khung giờ, tiêu đề thấp hơn một dòng, thêm cột "Giờ ca");
  // kế toán chèn thêm cột cũng không đọc nhầm. Thiếu chữ tiêu đề bắt buộc → từ chối, nêu đúng chữ.

  /** Tên dòng phiếu theo mã ca. Dạng B theo luật Dương chốt 06/11/2026: 5h–6h là tăng ca đêm, từ 6h là tăng ca ngày. */
  var TEN_PHIEU_CA = {
    HCN: 'Tiền lương làm việc ca ngày/tháng', TCN: 'Tiền lương tăng ca ngày/tháng',
    HCD: 'Tiền lương làm việc ca đêm/tháng', TCD: 'Tiền lương tăng ca đêm/tháng',
    'CD20-22': 'Tiền lương ca đêm 20h–22h', 'CD22-5': 'Tiền lương ca đêm 22h–5h',
    'CD5-6': 'Tiền lương tăng ca đêm 5h–6h', 'CD6-8': 'Tiền lương tăng ca ngày 6h–8h',
    TCCN: 'Tiền lương Ngày chủ nhật/tháng', TCDCN: 'Tiền lương chủ nhật đêm/tháng',
    TCNL: 'Tiền lương ngày lễ/tháng', TCDNL: 'Tiền lương đêm ngày lễ/tháng'
  };
  /** [tên dòng trên phiếu, chữ phải có trong tiêu đề] */
  var PHIEU_PHU_CAP = [['Thưởng chuyên cần', 'thuong chuyen can'], ['Hỗ trợ xăng xe, đi lại', 'xang xe'],
                       ['Hỗ trợ nhà ở (Hỗ trợ đời sống)', 'nha o'], ['Hỗ trợ khác: Thâm niên, Hỗ trợ môi trường', 'ho tro khac'], ['Ăn ca', 'an ca']];

  var TEN_CA = { HCN: 'HC ngày', TCN: 'Tăng ca ngày', HCD: 'HC đêm', TCD: 'Tăng ca đêm', TCCN: 'Tăng ca chủ nhật',
                 TCDCN: 'Tăng ca đêm chủ nhật', TCNL: 'Tăng ca ngày lễ', TCDNL: 'Tăng ca đêm ngày lễ',
                 'CD20-22': 'Ca đêm 20h–22h', 'CD22-5': 'Ca đêm 22h–5h', 'CD5-6': 'Tăng ca đêm 5h–6h', 'CD6-8': 'Tăng ca ngày 6h–8h' };
  /** Cột tổng hợp của bảng lương (khoá `them`, kiểu lưới bày lại): [khoá, chữ phải có trong tiêu đề]. Chỉ để xem, không vào phép tính nào; thiếu cột thì trống, không chặn file. */
  var COT_THEM = [['quy_doi', 'quy doi'], ['cong_ngay', 'thuc te lam trong thang ca ngay'], ['cong_dem', 'thuc te lam trong thang ca dem'], ['cong_cc', 'cong xet chuyen can'],
                  ['cong_hc', 'cong hanh chinh'], ['le_phep', 'le + phep'], ['luong_cb', 'luong cb theo thang'], ['pc_tn', 'phu cap trach nhiem'], ['don_gia', 'don gia luong cb'],
                  ['luong_gio', 'luong cb tinh theo gio'], ['gio_le', 'ngay le nghi']];
  /** Cột đếm nghỉ / suất ăn ở dòng đầu mỗi người. */
  var COT_NGHI = [['np', 'nghi phep'], ['kp', 'khong phep'], ['ld', 'luu dong'], ['nv', 'nghi viec'],
                  ['nn', 'nghi ngang'], ['cv', 'cho viec'], ['cg', 'cat giam'], ['tsa', 'tong suat an']];

  /** Ngày vào: ô ngày tháng thật (số ngày Excel), hoặc chữ "05/09/2026" / "2026-09-05". Không đọc được → ''. */
  function docNgay(v) {
    if (typeof v === 'number') return laNgay(v) ? ngayExcel(v) : '';
    var s = String(v == null ? '' : v).trim(), m;
    if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s))) s = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
    var d = new Date(s + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().substring(0, 10) === s && s > '1950' ? s : '';
  }

  function timTrang(cacTrang, dau) {
    var ten = Object.keys(cacTrang).filter(function (t) { return chuanChu(t).indexOf(dau) === 0; });
    return ten.length ? ten[0] : '';
  }

  function baoGom(chu) { return function (s) { return s.indexOf(chu) >= 0; }; }
  function dungChu(chu) { return function (s) { return s === chu; }; }
  /** Cột đầu tiên (từ tuCot tới denCot) trong các dòng `dongs` có chữ khớp, xét lần lượt từng dòng. Không có → 0. */
  function timCot(bang, dongs, khop, tuCot, denCot) {
    for (var i = 0; i < dongs.length; i++) {
      var h = bang[dongs[i] - 1] || [];
      var den = denCot ? Math.min(denCot, h.length) : h.length;
      for (var c = tuCot || 1; c <= den; c++) {
        if (typeof h[c - 1] === 'string' && khop(chuanChu(h[c - 1]))) return c;
      }
    }
    return 0;
  }
  function laNgay(v) { return typeof v === 'number' && v > 30000 && v < 80000; }
  function laChuKhongSo(v) { return typeof v === 'string' && !trong(v) && isNaN(Number(v)); }

  function boCucChamCong(cc, tCC, chan) {
    var dongTD = 0;
    for (var r = 1; r <= 12 && !dongTD; r++) if (timCot(cc, [r], baoGom('cccd nha may'))) dongTD = r;
    if (!dongTD) {
      chan(tCC, '', 'Không thấy cột "CCCD NHÀ MÁY".', 'Chọn đúng file lương, giữ nguyên chữ tiêu đề các cột.');
      return null;
    }
    var hai = [dongTD, dongTD + 1];
    var bc = { ma_ct: timCot(cc, [dongTD], baoGom('ma cong ty')), dong_ngay: dongTD + 1 };
    [['cccd', 'CCCD NHÀ MÁY', baoGom('cccd nha may')], ['ten', 'HỌ VÀ TÊN NHÀ MÁY', baoGom('ho va ten nha may')],
     ['cccd_thuc', 'CCCD THỰC', baoGom('cccd thuc')], ['ten_thuc', 'HỌ VÀ TÊN THỰC', baoGom('ho va ten thuc')],
     ['tuyen', 'Người tuyển dụng', baoGom('tuyen dung')], ['ca', 'Ca', dungChu('ca')], ['tong', 'Tổng giờ công', baoGom('tong gio cong')]
    ].forEach(function (x) {
      bc[x[0]] = timCot(cc, hai, x[2]);
      if (!bc[x[0]]) chan(tCC, '', 'Không thấy cột "' + x[1] + '".', 'Giữ nguyên chữ tiêu đề các cột trên trang chấm công.');
    });
    if (!bc.ca || !bc.tong) return bc;
    bc.cot_ngay = 0;
    for (var c = bc.ca + 1; c < bc.tong && !bc.cot_ngay; c++) if (laNgay(o(cc, bc.dong_ngay, c))) bc.cot_ngay = c;
    if (!bc.cot_ngay) {
      chan(tCC, tenO(bc.dong_ngay, bc.ca + 1), 'Không thấy ngày của bảng công ở dòng ' + bc.dong_ngay + '.', 'Ô ngày phải là ngày tháng thật, không gõ dạng chữ.');
      return bc;
    }
    bc.so_ngay = bc.tong - bc.cot_ngay;
    bc.dau = bc.dong_ngay + 1;                                       // dòng dữ liệu đầu = dòng đầu có mã ca bằng chữ (bỏ dòng thứ, dòng đánh số cột)
    while (bc.dau <= cc.length && !laChuKhongSo(o(cc, bc.dau, bc.ca))) bc.dau++;
    bc.nghi = COT_NGHI.map(function (x) { return [x[0], timCot(cc, hai, baoGom(x[1]), bc.tong + 1)]; })
                      .filter(function (x) { return x[1]; });
    // Vé 16: cho sổ lưu trữ + file giờ Tháng N. Chỉ tìm trước cột Ca; thiếu cột hay ô trống đều không chặn tải
    bc.so_code = timCot(cc, hai, baoGom('so code'), 1, bc.ca - 1);
    bc.sinh = timCot(cc, hai, function (s) { return s.indexOf('nam sinh') >= 0 || s.indexOf('ngay sinh') >= 0; }, 1, bc.ca - 1);
    bc.ngay_nghi = timCot(cc, hai, baoGom('ngay nghi'), 1, bc.ca - 1);
    return bc;
  }

  /** Vé 16 — số code, ngày sinh, ngày nghỉ của một người, đọc ở dòng đầu của người đó. Ô sai dạng coi như trống. */
  function thongTinNguoi(cc, r, bc) {
    var doc = function (cot) { return cot ? docNgay(o(cc, r, cot)) : ''; }, ma = bc.so_code ? o(cc, r, bc.so_code) : '';
    return { so_code: trong(ma) || ma === 0 ? '' : String(ma).trim(), ngay_sinh: doc(bc.sinh), ngay_nghi: doc(bc.ngay_nghi) };
  }

  function boCucBangLuong(bl, tBL, chan) {
    var dongMa = 0;
    for (var r = 1; r <= 12 && !dongMa; r++) if (timCot(bl, [r], dungChu('hcn'))) dongMa = r;
    if (!dongMa) {
      chan(tBL, '', 'Không thấy dòng mã ca (HCN, TCN, …) trên tiêu đề bảng lương.', 'Chọn đúng file lương, giữ nguyên dòng mã ca.');
      return null;
    }
    var dongs = [dongMa - 3, dongMa - 2, dongMa - 1], dongTen = dongMa - 1, dongNhom = dongMa - 2;
    var bc = { dau: dongMa + 1, ca: [] };
    function can(ten, khop, tu, den) {
      var x = timCot(bl, dongs, khop, tu, den);
      if (!x) chan(tBL, '', 'Không thấy cột "' + ten + '".', 'Giữ nguyên chữ tiêu đề các cột trên bảng lương.');
      return x;
    }
    var c = timCot(bl, [dongMa], dungChu('hcn'));
    for (; laChuKhongSo(o(bl, dongMa, c)); c++) bc.ca.push({ ma: String(o(bl, dongMa, c)).trim().toUpperCase(), cot_gio: c });
    var cuoiMa = c - 1;
    bc.cccd = can('CCCD', dungChu('cccd'));
    // 2.7.1: cột STT của bảng lương — số người phát lương dò trên tờ ký nhận; thiếu tiêu đề thì cột A như file mẫu
    bc.stt = timCot(bl, dongs, dungChu('stt'), 1, bc.cccd || undefined) || 1;
    // "Tổng cộng" (tiền) và "TỔNG CÔNG" (số công) bỏ dấu là một chữ — chỉ tìm SAU các cột giờ
    bc.tong_luong = can('Tổng cộng', dungChu('tong cong'), cuoiMa + 1);
    bc.tong_pc = can('Tổng Phụ Cấp', baoGom('tong phu cap'), bc.tong_luong + 1);
    bc.tong_luong_pc = can('Tổng lương và các khoản phụ cấp, hỗ trợ', baoGom('tong luong va cac khoan phu cap'), bc.tong_luong + 1);
    bc.tong_gt = can('Tổng giảm trừ', baoGom('tong giam tru'), bc.tong_luong + 1);
    bc.thuc_linh = can('Thực lĩnh', baoGom('thuc linh'), bc.tong_luong + 1);
    bc.ky_nhan = can('Ký nhận', baoGom('ky nhan'), bc.tong_luong + 1);
    bc.ghi_chu = timCot(bl, dongs, dungChu('ghi chu'), bc.tong_luong + 1);
    // Cột tổng hợp nằm TRƯỚC các cột giờ. "TỔNG CÔNG" (số công) bỏ dấu trùng "Tổng cộng" (tiền) nên tìm trong vùng này; "ngày lễ nghỉ" có hai cột: giờ trước, tiền sau
    var dauCa = bc.ca.length ? bc.ca[0].cot_gio - 1 : cuoiMa;
    bc.them = {};
    COT_THEM.forEach(function (x) { var cot1 = timCot(bl, dongs, baoGom(x[1]), 1, dauCa); if (cot1) bc.them[x[0]] = cot1; });
    var cotCong = timCot(bl, dongs, dungChu('tong cong'), 1, dauCa);
    if (cotCong) bc.them.tong_cong = cotCong;
    var cotTienLe = bc.tong_luong ? timCot(bl, dongs, baoGom('ngay le nghi'), cuoiMa + 1, bc.tong_luong - 1) : 0;
    if (cotTienLe) bc.them.tien_le = cotTienLe;
    bc.ca.forEach(function (x) {                                     // cột tiền của một ca = cột cùng chữ tiêu đề với cột giờ của ca đó
      var chu = chuanChu(o(bl, dongTen, x.cot_gio));
      x.cot_tien = chu && bc.tong_luong ? timCot(bl, [dongTen], dungChu(chu), cuoiMa + 1, bc.tong_luong - 1) : 0;
      if (!x.cot_tien) chan(tBL, tenO(dongTen, x.cot_gio), 'Không thấy cột tiền của ca ' + x.ma + '.', 'Cột giờ và cột tiền của một ca phải cùng chữ tiêu đề ở dòng ' + dongTen + '.');
    });
    bc.phu_cap = PHIEU_PHU_CAP.map(function (p) { return { ten: p[0], cot: can(p[0], baoGom(p[1]), bc.tong_luong + 1, bc.tong_pc - 1) }; });
    bc.khau_tru = [];
    if (bc.tong_luong_pc && bc.tong_gt) {
      for (c = bc.tong_luong_pc + 1; c < bc.tong_gt; c++) {
        var chu = o(bl, dongNhom, c);
        if (!trong(chu)) bc.khau_tru.push({ ten: chuanChu(chu) === 'luu dong' ? 'Tiền lưu động đã nhận' : String(chu).replace(/\s+/g, ' ').trim(), cot: c });
      }
      if (!bc.khau_tru.length) chan(tBL, '', 'Không thấy cột khấu trừ nào (Tạm ứng, Lưu động, Giảm trừ khác).', 'Giữ nguyên chữ tiêu đề ở dòng ' + dongNhom + '.');
    }
    return bc;
  }

  /** Thiếu ngày sinh không chặn, nhưng file giờ Tháng N sẽ không xét được tuổi: nói một câu gộp. */
  function nhacThieuSinh(ds, trang, bao) {
    var so = ds.filter(function (n) { return !n.ngay_sinh; }).length;
    if (so) bao(trang, '', so + ' người thiếu hoặc sai ngày sinh: vẫn lưu được, nhưng file giờ Tháng N không xét được tuổi của họ. Điền cột "Ngày tháng năm sinh" rồi tải lại nếu cần.');
  }

  function laDongTong(bl, b) {
    for (var c = 1; c <= 4; c++) if (chuanChu(o(bl, b, c)) === 'tong cong') return true;
    return false;
  }
  function thangDep(ky) { return ky.substring(5) + '/' + ky.substring(0, 4); }

  /**
   * 2.4.0 vé 04 — tên công ty ghi trong file (cột MÃ CÔNG TY) có phải công ty đã chọn: khớp Tên công ty (tên chuẩn theo hợp đồng, Dương chốt 11/11),
   * hoặc Mã, hoặc ô "Tên chạy lương" cũ đã điền (để file đang dùng không bị chặn). So không dấu, không khoảng trắng, không phân biệt hoa thường.
   */
  function khopCongTy(tenFile, tuyChon) {
    var x = chuanMaCT(tenFile);
    return !!x && [tuyChon.ten_ct, tuyChon.ma_ct, tuyChon.ten_chay_luong].some(function (v) { return chuanMaCT(v) === x; });
  }
  /** Câu báo + cách sửa khi file ghi công ty khác: một tên thì "Lấy tên này" (vé 04) sửa được ngay. */
  function cauSaiCongTy(dsTen, tuyChon) {
    var ma = chuanMaCT(tuyChon.ma_ct);
    return ['File ghi tên công ty "' + dsTen.join('", "') + '", không khớp công ty đã chọn: ' + (tuyChon.ten_ct || ma) + ' (mã ' + ma + ').',
            dsTen.length > 1 ? 'File có nhiều công ty — chọn đúng file của một công ty.'
              : 'Đúng công ty này thì kế toán bấm "Lấy tên này" ngay dưới (Tên công ty theo hợp đồng), hoặc chọn đúng công ty, đúng file.'];
  }

  // ---------- đọc ----------

  function docFile(cacTrang, tuyChon) {
    tuyChon = tuyChon || {};
    var loi = [], canhBao = [], chan = taoChan(loi, cacTrang);
    function bao(trang, oTen, cau) { canhBao.push({ trang: trang, o: oTen, loi: cau }); }
    var kq = { ok: false, loi: loi, canh_bao: canhBao, nguoi: [], tong: null, thong_tin: {} };

    var tCC = timTrang(cacTrang, '1.cham cong'), tBL = timTrang(cacTrang, '2.bang luong');
    if (!tCC) chan('', '', 'Không thấy trang "1.Chấm công …".', 'Chọn đúng file lương theo mẫu (có trang 1.Chấm công, 2.Bảng lương).');
    if (!tBL) chan('', '', 'Không thấy trang "2.Bảng lương …".', 'Chọn đúng file lương theo mẫu (có trang 1.Chấm công, 2.Bảng lương).');
    if (loi.length) return kq;
    var cc = cacTrang[tCC] || [], bl = cacTrang[tBL] || [];

    var bCC = boCucChamCong(cc, tCC, chan), bBL = boCucBangLuong(bl, tBL, chan);
    if (loi.length) return kq;

    // --- ngày của bảng công; KỲ = tháng của ngày cuối kỳ công (file YUWON ô S2 ghi "Tháng 8" dù là kỳ 9) ---
    var ngay = [];
    for (var j = 0; j < bCC.so_ngay; j++) ngay.push(ngayExcel(o(cc, bCC.dong_ngay, bCC.cot_ngay + j)));
    var ngayCuoi = ngay.filter(function (x) { return x; }).sort().pop();
    var kyFile = ngayCuoi.substring(0, 7);
    kq.thong_tin.ky = kyFile;
    if (tuyChon.ky && kyFile !== tuyChon.ky) {
      chan(tCC, tenO(bCC.dong_ngay, bCC.cot_ngay + bCC.so_ngay - 1), 'File là lương kỳ ' + thangDep(kyFile) + ', ô anh/chị chọn là kỳ ' +
           thangDep(tuyChon.ky) + '.', 'Chọn đúng ô kỳ trên lưới, hoặc chọn đúng file.', { loai: 'thang', ky_file: kyFile });
    }
    var cuoiDep = ngayCuoi.substring(8) + '/' + ngayCuoi.substring(5, 7) + '/' + ngayCuoi.substring(0, 4);
    /** Chữ "tháng" ghi trên file lệch ngày thật → chỉ nhắc: ngày của kỳ công mới là chuẩn. */
    function nhacThang(trang, oTen, thang, nam) {
      if (nam + '-' + ('0' + Number(thang)).slice(-2) === kyFile) return;
      bao(trang, oTen, 'Ô ' + oTen + ' ghi tháng ' + Number(thang) + '/' + nam + ', nhưng ngày cuối bảng công là ' + cuoiDep + ' — máy lấy kỳ ' + thangDep(kyFile) + '.');
    }
    (bl[1] || []).forEach(function (v, i) {
      var m = /thang\s*(\d{1,2})\s*nam\s*(\d{4})/.exec(chuanChu(v));
      if (m) nhacThang(tBL, tenO(2, i + 1), m[1], m[2]);
    });
    (cc[bCC.dong_ngay - 2] || []).forEach(function (v, i) {
      var m = /ngay trong thang\s*(\d{1,2})\s*\/\s*(\d{4})/.exec(chuanChu(v));
      if (m) nhacThang(tCC, tenO(bCC.dong_ngay - 1, i + 1), m[1], m[2]);
    });
    kq.thong_tin.nha_may = String(o(bl, 1, 1) || '').replace(/^\s*nh[aà] m[aá]y\s*:\s*/i, '').trim();
    kq.thong_tin.dia_ban = String(o(bl, 2, 1) || '').replace(/^\s*[dđ][iị]a b[aà]n\s*:\s*/i, '').trim();
    kq.thong_tin.don_vi = String(o(cc, 1, 1) || '').trim();

    // --- chấm công: gom theo CCCD nhà máy ---
    var theoCCCD = {}, thuTu = [], maCTFile = {};
    // Vé 08: máy tính lương cần ngày vào. Trang chấm công file 334 có cột này; thiếu thì lúc tính mới chặn, đọc file lương vẫn được
    var cVao = timCot(cc, [bCC.dong_ngay - 1, bCC.dong_ngay], baoGom('ngay vao'));
    for (var r = bCC.dau; r <= cc.length; r++) {
      var cRaw = o(cc, r, bCC.cccd);
      if (trong(cRaw) || cRaw === 0 || cRaw === '0') continue;           // dòng khuôn trống
      var cNM = chuanSoGiayTo(cRaw);
      if (!cNM) { chan(tCC, tenO(r, bCC.cccd), 'Số CCCD nhà máy không hợp lệ.', 'Cần 12 số CCCD (hoặc 9 số CMND).'); continue; }
      var mct = bCC.ma_ct ? chuanMaCT(o(cc, r, bCC.ma_ct)) : '';
      if (mct) maCTFile[mct] = true;
      var ng = theoCCCD[cNM];
      if (!ng) {
        var fRaw = o(cc, r, bCC.cccd_thuc), cThuc = trong(fRaw) || fRaw === 0 ? '' : chuanSoGiayTo(fRaw);
        if (!trong(fRaw) && fRaw !== 0 && !cThuc) chan(tCC, tenO(r, bCC.cccd_thuc), 'Số CCCD thực không hợp lệ.', 'Cần 12 số CCCD (hoặc 9 số CMND), hoặc để trống.');
        var tenNM = String(o(cc, r, bCC.ten) || '').replace(/\s+/g, ' ').trim();
        var tenThuc = String(o(cc, r, bCC.ten_thuc) || '').replace(/\s+/g, ' ').trim();
        ng = theoCCCD[cNM] = {
          dong: r, stt: o(cc, r, 1), cccd_nha_may: cNM, ten_nha_may: tenNM,
          cccd_tra: cThuc || cNM, ten_hien: tenThuc || tenNM,
          nguoi_tuyen: String(o(cc, r, bCC.tuyen) || '').trim(), ngay_vao: cVao ? docNgay(o(cc, r, cVao)) : '', tt: thongTinNguoi(cc, r, bCC), ca: [], nghi: {}
        };
        bCC.nghi.forEach(function (x) { var v = so(o(cc, r, x[1])); if (v) ng.nghi[x[0]] = v; });
        thuTu.push(cNM);
      }
      var ma = String(o(cc, r, bCC.ca) || '').trim().toUpperCase();
      var gio = [], coSo = false;
      for (var k = 0; k < bCC.so_ngay; k++) {
        var v = o(cc, r, bCC.cot_ngay + k), n = so(v);
        if (n === null) gio.push(null);
        else if (isNaN(n)) { gio.push(String(v).trim()); coSo = true; }   // ký hiệu chữ (NP, NL, np…): giữ nguyên để hiện đúng như file
        else { gio.push(tron(n, 2)); if (n) coSo = true; }
      }
      var tongCa = so(o(cc, r, bCC.tong));
      if (tongCa !== null && isNaN(tongCa)) chan(tCC, tenO(r, bCC.tong), 'Tổng giờ công không phải số.', 'Kiểm công thức ô tổng giờ.');
      ng.ca.push({ ma: ma, ten: TEN_CA[ma] || ma || '(không ghi ca)', gio: gio, tong: tongCa === null || isNaN(tongCa) ? null : tron(tongCa, 2),
                   co_ngay: coSo });
    }
    var dsMa = Object.keys(maCTFile);
    kq.thong_tin.ma_ct = dsMa.join(', ');
    // Tên trên file có thể khác mã trong hệ (MAGTRON ↔ MT). 2.4.0 vé 04: khớp theo Tên công ty (tên hợp đồng), Mã, hoặc ô Tên chạy lương cũ
    if (tuyChon.ma_ct && dsMa.length && (dsMa.length > 1 || !khopCongTy(dsMa[0], tuyChon))) {
      var sct = cauSaiCongTy(dsMa, tuyChon);
      chan(tCC, tenO(bCC.dau, bCC.ma_ct), sct[0], sct[1], { loai: 'cong_ty', ma_file: dsMa.length === 1 ? String(o(cc, bCC.dau, bCC.ma_ct) || dsMa[0]).trim() : '' });
    }

    // --- bảng lương ---
    var daThay = {}, dongTong = null, tongThucLinh = 0, ngoaiCC = [];
    for (var b = bBL.dau; b <= bl.length; b++) {
      if (laDongTong(bl, b)) { dongTong = b; break; }
      var raw = o(bl, b, bBL.cccd);
      if (trong(raw) || raw === 0 || raw === '0') continue;
      var c = chuanSoGiayTo(raw);
      if (!c) { chan(tBL, tenO(b, bBL.cccd), 'Số CCCD không hợp lệ.', 'Cần 12 số CCCD (hoặc 9 số CMND).'); continue; }
      if (daThay[c]) { chan(tBL, tenO(b, bBL.cccd), 'Số CCCD này đã có ở dòng ' + daThay[c] + '.', 'Mỗi người một dòng — xoá dòng lặp.'); continue; }
      daThay[c] = b;
      var nCC = theoCCCD[c];
      if (!nCC) {
        // 2.4.0 vé 03: báo vàng, không chặn — người này không có bảng công để ghép nên không có phiếu; thực lĩnh vẫn tính khi so dòng Tổng cộng
        var tlNgoai = so(o(bl, b, bBL.thuc_linh));
        ngoaiCC.push(tlNgoai === null || isNaN(tlNgoai) ? 0 : Math.round(tlNgoai));
        bao(tBL, tenO(b, bBL.cccd), 'Người ở dòng ' + b + ' bảng lương (CCCD …' + c.slice(-4) + ') không có trong trang chấm công — vẫn nhận file, nhưng người này không có phiếu. Đúng thì kiểm số CCCD ở hai trang.');
        continue;
      }
      var tl = so(o(bl, b, bBL.thuc_linh));
      if (tl === null || isNaN(tl)) {
        chan(tBL, tenO(b, bBL.thuc_linh), 'Ô thực lĩnh trống hoặc không phải số.', 'Mở file bằng Excel, để công thức tính xong rồi Lưu lại, sau đó chọn file lần nữa.');
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
        luong: bBL.ca.map(function (p) { return { ten: TEN_PHIEU_CA[p.ma] || p.ma, gio: gioO(p.cot_gio), tien: tien(p.cot_tien) }; }),
        tong_luong: tien(bBL.tong_luong),
        phu_cap: bBL.phu_cap.map(function (p) { return { ten: p.ten, tien: tien(p.cot) }; }),
        tong_phu_cap: tien(bBL.tong_pc),
        tong_luong_pc: tien(bBL.tong_luong_pc),
        khau_tru: bBL.khau_tru.map(function (p) { return { ten: p.ten, tien: tien(p.cot) }; }),
        tong_khau_tru: tien(bBL.tong_gt),
        thuc_linh: Math.round(tl)
      };
      // 2.7.1: STT nằm trong `luong` để theo phiếu ra trang công nhân (phát lương tìm theo số này). Ô trống → không có số
      var sttO = o(bl, b, bBL.stt), sttSo = so(sttO);
      if (!trong(sttO)) luong.stt = sttSo !== null && !isNaN(sttSo) ? Math.round(sttSo) : String(sttO).trim().substring(0, 12);
      if (dongLoiTien) continue;
      tongThucLinh += luong.thuc_linh;
      nCC.luong = luong;
      nCC.dong_luong = b;
      // Ký nhận, ghi chú: nội bộ của kế toán — để NGOÀI `luong` để không theo phiếu ra trang công nhân (traLuong_ chỉ gửi cong + luong)
      var kyO = o(bl, b, bBL.ky_nhan), kySo = so(kyO);
      nCC.ky_nhan = trong(kyO) ? '' : (kySo !== null && !isNaN(kySo) ? Math.round(kySo) : String(kyO).trim());
      nCC.ghi_chu = bBL.ghi_chu && !trong(o(bl, b, bBL.ghi_chu)) ? String(o(bl, b, bBL.ghi_chu)).trim() : '';
      nCC.them = {};
      Object.keys(bBL.them).forEach(function (k) { var x = so(o(bl, b, bBL.them[k])); if (x !== null && !isNaN(x)) nCC.them[k] = tron(x, 2); });
    }
    if (!dongTong) bao(tBL, '', 'Không thấy dòng "Tổng cộng" — không đối chiếu được tổng thực lĩnh.');
    else {
      var tongFile = so(o(bl, dongTong, bBL.thuc_linh)), tongMay = tongThucLinh + ngoaiCC.reduce(function (t, x) { return t + x; }, 0);
      kq.thong_tin.tong_dong_tong_cong = tongFile;
      if (tongFile !== null && !isNaN(tongFile) && Math.round(tongFile) !== tongMay && !loi.length) {
        chan(tBL, tenO(dongTong, bBL.thuc_linh), 'Tổng thực lĩnh từng người cộng lại là ' + tongMay.toLocaleString('vi-VN') +
             ' đ, dòng Tổng cộng ghi ' + Math.round(tongFile).toLocaleString('vi-VN') + ' đ.', 'Kiểm công thức dòng Tổng cộng có tính đủ mọi dòng.',
             { loai: 'tong', tong_may: tongMay, tong_file: Math.round(tongFile) });
      }
    }

    // --- ghép: người có công mà không có lương (bảng lương thiếu dòng) — 2.4.0 vé 03: báo vàng, người đó không có phiếu trong file này ---
    thuTu.forEach(function (c) {
      var n = theoCCCD[c];
      if (!n.luong && !daThay[c]) {
        bao(tBL, '', 'Người ở dòng ' + n.dong + ' trang chấm công (' + n.ten_hien + ') không có trong bảng lương — vẫn nhận file, nhưng người này không có phiếu. ' +
            'Bảng lương có thể thiếu dòng công thức: kéo thêm dòng rồi tải lại nếu cần.');
      }
    });

    var dsNguoi = thuTu.filter(function (c) { return theoCCCD[c].luong; }).map(function (c) {
      var n = theoCCCD[c];
      var coNgay = n.ca.some(function (x) { return x.co_ngay; });
      return {
        cccd_tra: n.cccd_tra, ten_tra: bienTheTen(n.ten_hien), ten_hien: n.ten_hien,
        cccd_nha_may: n.cccd_nha_may, ten_nha_may: n.ten_nha_may, nguoi_tuyen: n.nguoi_tuyen, ngay_vao: n.ngay_vao,
        so_code: n.tt.so_code, ngay_sinh: n.tt.ngay_sinh, ngay_nghi: n.tt.ngay_nghi,
        cong: { ngay: ngay, co_chi_tiet: coNgay,
                ca: n.ca.map(function (x) { return { ma: x.ma, ten: x.ten, gio: x.gio, tong: x.tong }; }), nghi: n.nghi },
        luong: n.luong, ky_nhan: n.ky_nhan, ghi_chu: n.ghi_chu, them: n.them
      };
    });
    var cacTra = {};
    dsNguoi.forEach(function (n) {
      if (cacTra[n.cccd_tra]) bao(tCC, '', 'Hai hồ sơ nhà máy cùng một CCCD thực (' + n.ten_hien + ') — người đó tra sẽ thấy cả hai phiếu.');
      cacTra[n.cccd_tra] = true;
    });
    nhacThieuSinh(dsNguoi, tCC, bao);

    kq.nguoi = dsNguoi;
    kq.tong = { so_nguoi: dsNguoi.length, tong_thuc_linh: tongThucLinh };
    if (!dsNguoi.length && !loi.length) chan(tBL, '', 'File không có người nào có lương.', 'Kiểm file đã điền dữ liệu chưa.');
    kq.ok = !loi.length;
    return kq;
  }

  goc.DocFileLuong = { docFile: docFile, chuanSoGiayTo: chuanSoGiayTo, chuanTenTra: chuanTenTra, bienTheTen: bienTheTen,
                       ngayExcel: ngayExcel, tenO: tenO, TEN_PHIEU_CA: TEN_PHIEU_CA,
                       // doc-bang-cong.js đọc cùng bố cục trang Chấm công — dùng chung, không chép bản thứ hai
                       coBan: { o: o, so: so, tron: tron, trong: trong, chuanChu: chuanChu, laNgay: laNgay, docNgay: docNgay, laChuKhongSo: laChuKhongSo,
                                timCot: timCot, baoGom: baoGom, dungChu: dungChu, boCucChamCong: boCucChamCong, thangDep: thangDep, TEN_CA: TEN_CA,
                                thongTinNguoi: thongTinNguoi, nhacThieuSinh: nhacThieuSinh, taoChan: taoChan, diaChiO: diaChiO,
                                khopCongTy: khopCongTy, cauSaiCongTy: cauSaiCongTy } };
})(typeof window !== 'undefined' ? window : globalThis);
