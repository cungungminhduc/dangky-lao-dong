/**
 * KIỂU LƯỚI của trang nội bộ (máy tính) — đặc tả .scratch/ke-toan-excel/DAC-TA.md. Điện thoại giữ kiểu thẻ; nút 📱 về kiểu thẻ cũng có trên máy tính.
 * Không viết lại luật: các nút tải file, công bố, chốt… vẫn là code trong noibo.html, ngăn phải chỉ bày lại đúng HTML ô tháng (oKy).
 * Tệp này nạp TRƯỚC khối script của noibo.html; các hàm toàn cục của khối đó (goi, coCV, oKy, viecKe, taiLuoi…) chỉ gọi lúc chạy.
 * Hàm thuần ở `thuan` (kiểm bằng Node, kiem/kieuluoi.test.mjs): file thật đi qua đây phải khớp từng ô.
 */
var KieuLuoi = (function () {
  'use strict';
  var L = LuoiO;
  var KHOA_KIEU = 'cl_kieu', KHOA_ZOOM = 'cl_zoom';
  var MAU = { cam: '#FFC000', duong: '#00B0F0', vang: '#FFFF00', la: '#C5E0B3', hong: '#F8CBAD', nhat: '#BDD7EE', xam: '#D9D9D9', xam2: '#BFBFBF', ghi: '#D0CECE', luc: '#00B050', xanhdam: '#5B9BD5', vang2: '#FFD966', cam2: '#F4B183' };
  var DEM_COT = [['np', 'Nghỉ phép'], ['kp', 'Không phép'], ['ld', 'Lưu động'], ['nv', 'Nghỉ việc'], ['nn', 'Nghỉ ngang'], ['cv', 'Chờ việc'], ['cg', 'Cắt giảm'], ['tsa', 'Tổng suất ăn']];
  var THU_TU_CA = ['HCN', 'TCN', 'HCD', 'TCD', 'CD20-22', 'CD22-5', 'CD5-6', 'CD6-8', 'TCCN', 'TCDCN', 'TCNL', 'TCDNL'];
  var TEN_CA = { HCN: 'HC Ngày', TCN: 'Tăng ca ngày', HCD: 'HC đêm', TCD: 'Tăng ca đêm', 'CD20-22': 'Đêm 20h–22h', 'CD22-5': 'Đêm 22h–5h', 'CD5-6': 'Tăng ca đêm 5h–6h', 'CD6-8': 'Tăng ca ngày 6h–8h', TCCN: 'Tăng ca CN', TCDCN: 'Tăng ca đêm CN', TCNL: 'Tăng ca ngày lễ', TCDNL: 'Tăng ca đêm ngày lễ' };
  var NHOM_CA = { HCN: 'Ca Ngày', TCN: 'Ca Ngày', HCD: 'Ca Đêm', TCD: 'Ca Đêm', 'CD20-22': 'Ca Đêm', 'CD22-5': 'Ca Đêm', 'CD5-6': 'Ca Đêm', 'CD6-8': 'Ca Đêm', TCCN: 'Chủ nhật', TCDCN: 'Chủ nhật', TCNL: 'Ngày Lễ', TCDNL: 'Ngày Lễ' };
  /** Tên dòng phụ cấp trên phiếu theo thứ tự cố định — Code.gs PHIEU_PC_MAY, doc-file-luong.js PHIEU_PHU_CAP. */
  var PC_KHOA = ['cc', 'xang', 'nha', 'tham_nien', 'an'];
  var PC_TEN = ['Thưởng chuyên cần', 'Hỗ trợ xăng xe, đi lại', 'Hỗ trợ nhà ở (Hỗ trợ đời sống)', 'Hỗ trợ khác: Thâm niên, Hỗ trợ môi trường', 'Ăn ca'];

  function tenKy(ky) { return ky.substring(5) + '/' + ky.substring(0, 4); }
  function C(k, tieu, w, o) { o = o || {}; o.k = k; o.tieu = [].concat(tieu); o.w = w; return o; }
  function maTheoTen() {
    var ra = {}, t = DocFileLuong.TEN_PHIEU_CA;
    Object.keys(t).forEach(function (m) { ra[t[m]] = m; });
    return ra;
  }

  // ================== HÀM THUẦN: một người → các dòng ==================
  /** Người mới trong kỳ: ngày vào nằm trong kỳ công (như tinhLuong_ ở Code.gs). */
  function laMoi(n) {
    var ds = ((n.cong || {}).ngay || []).filter(Boolean).slice().sort();
    return !!(ds.length && n.ngay_vao && ds[0] <= n.ngay_vao && n.ngay_vao <= ds[ds.length - 1]);
  }
  function nenNguoi(n, vt, stt) {
    return { ky: vt.ky, ky_ten: tenKy(vt.ky), ma_ct: vt.ma_ct, ten_ct: vt.ten_ct, dia: vt.dia, stt: stt, ho_ten: n.ten_nha_may || n.ten_hien || '', cccd_nm: n.cccd_nha_may || '',
             code: n.so_code || '', cccd_thuc: n.cccd_tra || '', ten_thuc: n.ten_hien || '', sinh: n.ngay_sinh || '', vao: n.ngay_vao || '', nghi_viec: n.ngay_nghi || '', tuyen: n.nguoi_tuyen || '',
             _pid: vt.ma_ct + '|' + vt.ky + '|' + (n.cccd_nha_may || n.cccd_tra), _n: n, _vt: vt, _moi: laMoi(n), _kp: Number(((n.cong || {}).nghi || {}).kp) > 0 };
  }
  function tongCa(x) {
    if (x.tong != null) return x.tong;
    var t = 0, co = false;
    (x.gio || []).forEach(function (g) { if (typeof g === 'number') { t += g; co = true; } });
    return co ? t : null;
  }
  /** Bảng công đúng khuôn 1.Chấm công: mỗi người một dòng cho mỗi mã ca; cột đếm chỉ ở dòng đầu mỗi người (trong file là ô gộp). */
  function dongCongNguoi(n, vt, stt) {
    var c = n.cong || {}, ngay = c.ngay || [], nghi = c.nghi || {}, nen = nenNguoi(n, vt, stt);
    return (c.ca || []).map(function (x, i) {
      var r = Object.assign({}, nen, { ca: x.ma, tong: tongCa(x), _dau: i === 0 });
      ngay.forEach(function (d, j) { if (d && x.gio && x.gio[j] != null && x.gio[j] !== 0 && x.gio[j] !== '') r['d' + d] = x.gio[j]; });
      if (i === 0) DEM_COT.forEach(function (o) { r[o[0]] = Number(nghi[o[0]]) || 0; });
      return r;
    });
  }
  /** Bảng công một người một dòng, để gộp: giờ từng mã ca + tổng + cột đếm. */
  function dongCongGop(n, vt, stt) {
    var c = n.cong || {}, nghi = c.nghi || {}, r = nenNguoi(n, vt, stt), tong = 0;
    (c.ca || []).forEach(function (x) { var t = tongCa(x) || 0; r['gio_' + x.ma] = (r['gio_' + x.ma] || 0) + t; tong += t; });
    r.tong = tong;
    DEM_COT.forEach(function (o) { r[o[0]] = Number(nghi[o[0]]) || 0; });
    return r;
  }
  /** Bảng lương một người. Chưa có phiếu → null. `n.them` = các cột tổng hợp của file (vé 06). Khấu trừ phân loại như oTuFile_ ở Code.gs. */
  function dongLuongNguoi(n, vt, stt) {
    if (!n.luong) return null;
    var l = n.luong, r = nenNguoi(n, vt, stt), nghi = (n.cong || {}).nghi || {}, ma = maTheoTen();
    r.ho_ten = String(r.ho_ten).toUpperCase();
    (l.luong || []).forEach(function (x) { var m = ma[x.ten] || x.ten; r['gio_' + m] = x.gio; r['tien_' + m] = x.tien; });
    (l.phu_cap || []).forEach(function (x, i) { if (PC_KHOA[i]) r[PC_KHOA[i]] = x.tien; });
    r.tam_ung = 0; r.luu_dong = 0; r.giam_khac = 0;
    (l.khau_tru || []).forEach(function (k) {
      var t = L.boDau(k.ten), so = Number(k.tien) || 0;
      if (t.indexOf('tam ung') >= 0) r.tam_ung += so; else if (t.indexOf('luu dong') >= 0) r.luu_dong += so; else r.giam_khac += so;
    });
    r.tien_gio = l.tong_luong; r.tong_pc = l.tong_phu_cap; r.tong_luong_pc = l.tong_luong_pc; r.giam_tru = l.tong_khau_tru; r.thuc_linh = l.thuc_linh;
    r.ky_nhan = n.ky_nhan == null ? '' : n.ky_nhan; r.ghi_chu = n.ghi_chu || '';
    DEM_COT.forEach(function (o) { r[o[0]] = Number(nghi[o[0]]) || 0; });
    if (n.them) Object.keys(n.them).forEach(function (k) { r[k] = n.them[k]; });
    r.nguon = vt.nguon || ''; r.tinh_trang = vt.tinh_trang || '';
    return r;
  }
  /** Một dòng sổ lưu trữ (đối tượng theo COT_SO) → cùng dạng bản ghi người, để dùng chung mọi hàm trên và ve-phieu.js. Sổ không giữ từng ngày. */
  function nguoiTuSo(o) {
    var ten = DocFileLuong.TEN_PHIEU_CA, ca = [], ln = [], coLuong = o.thuc_linh !== '' && o.thuc_linh != null;
    THU_TU_CA.forEach(function (m) {
      var g = Number(o['gio_' + m]) || 0, t = Number(o['tien_' + m]) || 0;
      if (g) ca.push({ ma: m, ten: TEN_CA[m], gio: [], tong: g });
      if (g || t) ln.push({ ten: ten[m] || m, gio: g, tien: t });
    });
    var nghi = {};
    DEM_COT.forEach(function (x) { nghi[x[0]] = Number(o[x[0]]) || 0; });
    var n = { cccd_tra: o.cccd_thuc, ten_hien: o.ten_thuc, cccd_nha_may: o.cccd_nha_may, ten_nha_may: o.ten_nha_may, nguoi_tuyen: o.nguoi_tuyen, ngay_vao: o.ngay_vao, so_code: o.so_code, ngay_sinh: o.ngay_sinh, ngay_nghi: o.ngay_nghi,
              cong: { ngay: [], co_chi_tiet: false, ca: ca, nghi: nghi }, ky_nhan: o.ky_nhan, ghi_chu: o.ghi_chu, _tu_so: true };
    var them = {};
    COT_THEM.concat(['cong_hc', 'tong_cong', 'cong_cc']).forEach(function (k) { if (o[k] !== '' && o[k] != null) them[k] = o[k]; });
    n.them = them;
    if (coLuong) {
      n.luong = { luong: ln, tong_luong: o.tien_gio, tong_phu_cap: o.tong_pc, tong_luong_pc: o.tong_luong_pc, tong_khau_tru: o.giam_tru, thuc_linh: o.thuc_linh,
        phu_cap: PC_KHOA.map(function (k, i) { return { ten: PC_TEN[i], tien: o[k] }; }),
        khau_tru: [{ ten: 'Tạm ứng', tien: o.tam_ung }, { ten: 'Tiền lưu động đã nhận', tien: o.luu_dong }, { ten: 'Giảm trừ khác', tien: o.giam_khac }] };
    }
    return n;
  }
  var COT_THEM = ['cong_ngay', 'cong_dem', 'le_phep', 'luong_cb', 'pc_tn', 'don_gia', 'luong_gio', 'quy_doi', 'gio_le', 'tien_le'];
  /** Mã ca có trong các dòng, đúng thứ tự file; mã lạ xếp cuối, không rơi mất. */
  function maCaCo(ds, tienTo) {
    var co = {};
    ds.forEach(function (r) { Object.keys(r).forEach(function (k) { if (k.indexOf(tienTo) === 0) co[k.substring(tienTo.length)] = 1; }); });
    return THU_TU_CA.filter(function (m) { return co[m]; }).concat(Object.keys(co).filter(function (m) { return THU_TU_CA.indexOf(m) < 0; }).sort());
  }
  /** Các ngày có trong dòng, xếp tăng. */
  function ngayCo(ds) {
    var co = {};
    ds.forEach(function (r) { if (!r._dau) return; ((r._n.cong || {}).ngay || []).forEach(function (d) { if (d) co[d] = 1; }); });
    return Object.keys(co).sort();
  }
  function thuCua(iso) { return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(Date.UTC(+iso.substring(0, 4), +iso.substring(5, 7) - 1, +iso.substring(8, 10))).getUTCDay()]; }

  // ================== CỘT TỪNG TRANG ==================
  function cotThang(mot) { return mot ? [] : [C('ky_ten', 'Tháng', 62, { mau: MAU.xam, giua: 1 })]; }
  /** ds = các dòng đang có; `mot` = đang xem đúng một tháng. Cột từng ngày chỉ khi một tháng và có từng ngày. */
  function cotCong(ds, mot) {
    var x2 = MAU.xam2, cot = cotThang(mot).concat([
      C('stt', 'STT', 40, { mau: x2, giua: 1 }), C('ma_ct', 'MÃ CÔNG TY', 84, { mau: x2, giua: 1 }), C('ho_ten', 'HỌ VÀ TÊN NHÀ MÁY', 172, { mau: x2, lien: 1 }), C('ca', 'Ca', 66, { mau: x2, giua: 1, dam: 1 }),
      C('cccd_nm', 'CCCD NHÀ MÁY', 108, { mau: x2, giua: 1 }), C('code', 'SỐ CODE NHÀ MÁY', 100, { mau: x2, giua: 1, n: 'hs' }), C('cccd_thuc', 'CCCD THỰC', 108, { mau: x2, giua: 1, n: 'hs' }),
      C('ten_thuc', 'HỌ VÀ TÊN THỰC', 160, { mau: x2, n: 'hs' }), C('sinh', 'Ngày tháng năm sinh', 84, { mau: x2, kieu: 'ngay', giua: 1, n: 'hs' }), C('vao', 'NGÀY VÀO', 84, { mau: x2, kieu: 'ngay', giua: 1 }),
      C('nghi_viec', 'NGÀY NGHỈ', 84, { mau: x2, kieu: 'ngay', giua: 1, n: 'hs' }), C('tuyen', 'NV/vendor tuyển dụng', 90, { mau: x2, giua: 1 })
    ]);
    if (mot) {
      ngayCo(ds).forEach(function (d) {
        var t = thuCua(d), cn = t === 'CN', thang = d.substring(5, 7) + '/' + d.substring(0, 4);
        cot.push(C('d' + d, ['NGÀY TRONG KỲ CÔNG', d.substring(8, 10) + '/' + d.substring(5, 7), t], 44, { mauT: cn ? [x2, MAU.vang, MAU.luc] : [x2, x2, x2], kieu: 'ngayo', tong: 1, n: 'ngay', cn: cn, ct: 'Ngày ' + d.substring(8, 10) + '/' + thang + '. Số là giờ làm, chữ là ký hiệu trong file (NP, KP, LĐ…).' }));
      });
    }
    cot.push(C('tong', 'Tổng giờ công', 66, { mau: MAU.la, kieu: 'gio', tong: 1, dam: 1, ct: 'Lấy đúng ô tổng giờ của dòng ca này trong file.' }));
    DEM_COT.forEach(function (x) { cot.push(C(x[0], x[1], 50, { mau: MAU.hong, kieu: 'dem', tong: 1, n: 'dem', ct: 'Hành chính hoặc kế toán điền trong file. Máy đọc cột này, không đếm lại từ ô ngày.' })); });
    return cot;
  }
  function cotCongGop(ds) {
    var cot = [];
    maCaCo(ds, 'gio_').forEach(function (m) { cot.push(C('gio_' + m, ['Số giờ công', NHOM_CA[m] || 'Khác', TEN_CA[m] || m, m], 60, { mau: MAU.cam, kieu: 'gio', tong: 1 })); });
    cot.push(C('tong', 'Tổng giờ', 70, { mau: MAU.la, kieu: 'gio', tong: 1, dam: 1 }));
    DEM_COT.forEach(function (x) { cot.push(C(x[0], x[1], 52, { mau: MAU.hong, kieu: 'dem', tong: 1 })); });
    return cot;
  }
  /** Bảng lương đúng thứ tự + màu nhóm cột của trang 2.Bảng lương. Cột tổng hợp trống khi file tải trước bản giữ thêm cột này. */
  function cotLuong(ds, mot) {
    var d = MAU.duong, cot = cotThang(mot).concat([
      C('stt', 'STT', 40, { mau: d, giua: 1 }), C('ma_ct', 'Công ty', 84, { mau: d, giua: 1 }), C('ho_ten', 'Họ và tên', 186, { mau: d, lien: 1 }),
      C('code', 'Mã CODE', 100, { mau: d, giua: 1, n: 'hs' }), C('cccd_nm', 'CCCD', 108, { mau: d, giua: 1, n: 'hs' }), C('tuyen', 'Người tuyển', 84, { mau: d, giua: 1, n: 'hs' }),
      C('vao', ['THỜI GIAN LÀM VIỆC', 'Ngày vào'], 84, { mauT: [d, MAU.cam], kieu: 'ngay', giua: 1, n: 'hs' }),
      C('quy_doi', ['THỜI GIAN LÀM VIỆC', 'Quy đổi (tháng)'], 62, { mauT: [d, MAU.cam], kieu: 'gio', n: 'hs', ct: 'Số tháng từ ngày vào, cột QUY ĐỔI NGÀY của file.' }),
      C('cong_ngay', ['Tổng hợp ngày công', 'Ca ngày'], 62, { mau: MAU.la, kieu: 'gio', tong: 1, n: 'cong' }), C('cong_dem', ['Tổng hợp ngày công', 'Ca đêm'], 62, { mau: MAU.la, kieu: 'gio', tong: 1, n: 'cong' }),
      C('cong_cc', ['Tổng hợp ngày công', 'Công xét chuyên cần'], 66, { mau: MAU.la, kieu: 'gio', tong: 1, n: 'cong', ct: '= Công hành chính + ngày chờ việc.' }),
      C('tong_cong', ['Tổng hợp ngày công', 'TỔNG CÔNG'], 62, { mau: MAU.la, kieu: 'gio', tong: 1, dam: 1, n: 'cong', ct: 'Dùng xét ngưỡng người mới và thâm niên.' }),
      C('cong_hc', ['Tổng hợp ngày công', 'Công Hành chính'], 66, { mau: MAU.la, kieu: 'gio', tong: 1, n: 'cong', ct: '= Tổng giờ các mã ca hành chính ÷ 8.' }),
      C('le_phep', ['Tổng hợp ngày công', 'Lễ + phép năm'], 58, { mau: MAU.la, kieu: 'gio', tong: 1, n: 'cong' }),
      C('luong_cb', 'Lương CB theo tháng', 88, { mau: d, kieu: 'tien', n: 'cb' }), C('pc_tn', 'Phụ cấp trách nhiệm', 80, { mau: MAU.hong, kieu: 'tien', n: 'cb' }),
      C('don_gia', 'Đơn giá lương CB + PC trách nhiệm theo giờ công', 88, { mau: MAU.hong, kieu: 'tien', n: 'cb', ct: '= (Lương cơ bản + phụ cấp trách nhiệm) ÷ 26 ÷ 8.' }), C('luong_gio', 'Lương CB tính theo giờ công', 78, { mau: d, kieu: 'tien', n: 'cb' }),
      C('gio_le', ['Số giờ công', 'Lễ nghỉ, phép'], 58, { mau: MAU.cam, kieu: 'gio', tong: 1, n: 'gio', ct: 'Ngày lễ nghỉ, nghỉ phép hưởng nguyên lương.' })
    ]), ca = maCaCo(ds, 'gio_');
    ca.forEach(function (m) { cot.push(C('gio_' + m, ['Số giờ công', NHOM_CA[m] || 'Khác', TEN_CA[m] || m, m], 60, { mau: MAU.cam, kieu: 'gio', tong: 1, n: 'gio' })); });
    cot.push(C('tien_le', ['Tiền lương theo giờ công', 'Lễ nghỉ, phép'], 80, { mau: MAU.vang, kieu: 'tien', tong: 1, n: 'tien' }));
    ca.forEach(function (m) { cot.push(C('tien_' + m, ['Tiền lương theo giờ công', NHOM_CA[m] || 'Khác', TEN_CA[m] || m], 88, { mau: MAU.vang, kieu: 'tien', tong: 1, n: 'tien', ct: '= Đơn giá giờ × hệ số ' + m + ' × giờ ' + m + '.' })); });
    cot = cot.concat([
      C('tien_gio', 'Tổng cộng', 98, { mau: MAU.luc, kieu: 'tien', tong: 1, dam: 1, n: 'tien' }),
      C('cc', ['Các khoản phụ cấp, hỗ trợ', 'Thưởng chuyên cần'], 84, { mau: MAU.la, kieu: 'tien', tong: 1, n: 'pc' }), C('xang', ['Các khoản phụ cấp, hỗ trợ', 'Hỗ trợ xăng xe, đi lại'], 84, { mau: MAU.la, kieu: 'tien', tong: 1, n: 'pc' }),
      C('nha', ['Các khoản phụ cấp, hỗ trợ', 'Hỗ trợ nhà ở (đời sống)'], 84, { mau: MAU.la, kieu: 'tien', tong: 1, n: 'pc' }), C('tham_nien', ['Các khoản phụ cấp, hỗ trợ', 'Thâm niên, môi trường'], 84, { mau: MAU.la, kieu: 'tien', tong: 1, n: 'pc' }),
      C('an', ['Các khoản phụ cấp, hỗ trợ', 'Ăn ca'], 80, { mau: MAU.la, kieu: 'tien', tong: 1, n: 'pc', ct: '= Tiền một suất × cột Tổng suất ăn.' }), C('tong_pc', 'Tổng Phụ Cấp', 90, { mau: MAU.luc, kieu: 'tien', tong: 1, n: 'pc' }),
      C('tong_luong_pc', 'Tổng lương và các khoản phụ cấp, hỗ trợ', 112, { mau: MAU.luc, kieu: 'tien', tong: 1, dam: 1, ct: '= Tổng cộng tiền giờ + Tổng phụ cấp. Đây là cột "Tiền lương phải trả CN" của file giờ Tháng N.' }),
      C('tam_ung', ['CÁC KHOẢN GIẢM TRỪ', 'Tạm ứng'], 86, { mau: MAU.nhat, kieu: 'tien', tong: 1, n: 'tru' }), C('luu_dong', ['CÁC KHOẢN GIẢM TRỪ', 'Lưu động'], 82, { mau: MAU.nhat, kieu: 'tien', tong: 1, n: 'tru' }),
      C('giam_khac', ['CÁC KHOẢN GIẢM TRỪ', 'Giảm trừ khác'], 82, { mau: MAU.nhat, kieu: 'tien', tong: 1, n: 'tru', ct: 'Ý thức làm việc, đồng phục, nghỉ không phép.' }), C('giam_tru', 'Tổng giảm trừ', 90, { mau: MAU.luc, kieu: 'tien', tong: 1, n: 'tru' }),
      C('thuc_linh', 'Thực lĩnh', 104, { mau: MAU.ghi, kieu: 'tien', tong: 1, dam: 1, lop: function (r) { return r.thuc_linh < 0 ? 'am' : ''; }, ct: 'Ô Thực lĩnh của file, đã làm tròn nghìn. Số âm: người đó đã nhận trước nhiều hơn lương kỳ này.' }),
      C('ky_nhan', 'Ký nhận', 98, { mau: MAU.ghi, kieu: 'tien', lop: function (r) { return r.ky_nhan === 'KTT' ? 'ma-do giua' : ''; }, ct: 'Có chữ KTT: công nhân không thấy bảng công và phiếu lương trên trang tra cứu.' }),
      C('ghi_chu', 'Ghi chú', 170, { mau: MAU.ghi })
    ]);
    DEM_COT.forEach(function (x) { cot.push(C(x[0], ['Ý THỨC LÀM VIỆC / CHẤP HÀNH QUY ĐỊNH', x[1]], 50, { mau: MAU.hong, kieu: 'dem', tong: 1, n: 'dem' })); });
    cot.push(C('nguon', 'Nguồn', 68, { mau: MAU.xam, giua: 1, n: 'ngu' })); cot.push(C('tinh_trang', 'Tình trạng', 124, { mau: MAU.xam, n: 'ngu' }));
    return cot;
  }

  /** Khoản trừ: một người + số tiền từng khoản. `x` = { tam_ung, luu_dong, giam_tru_khac, ghi_chu }. */
  function dongTru(n, vt, stt, x, nguon) {
    var r = nenNguoi(n, vt, stt);
    r.tam_ung = Number(x.tam_ung) || 0; r.luu_dong = Number(x.luu_dong) || 0; r.giam_khac = Number(x.giam_tru_khac) || 0;
    r.tong_tru = r.tam_ung + r.luu_dong + r.giam_khac; r.ghi_chu = x.ghi_chu || ''; r.nguon_tru = nguon;
    return r;
  }
  function cotTru(mot) {
    var n = MAU.nhat;
    return cotThang(mot).concat([C('stt', 'STT', 40, { mau: n, giua: 1 }), C('ma_ct', 'Công ty', 84, { mau: n, giua: 1 }), C('ho_ten', 'Họ và tên', 186, { mau: n, lien: 1 }), C('cccd_nm', 'CCCD nhà máy', 108, { mau: n, giua: 1 }), C('tuyen', 'Người tuyển', 90, { mau: n, giua: 1 }),
      C('tam_ung', 'Tạm ứng', 100, { mau: MAU.vang, kieu: 'tien', tong: 1 }), C('luu_dong', 'Lưu động', 100, { mau: MAU.vang, kieu: 'tien', tong: 1 }), C('giam_khac', 'Giảm trừ khác', 100, { mau: MAU.vang, kieu: 'tien', tong: 1, ct: 'Ý thức làm việc, đồng phục, nghỉ không phép.' }),
      C('tong_tru', 'Tổng trừ', 106, { mau: MAU.luc, kieu: 'tien', tong: 1, dam: 1 }), C('ghi_chu', 'Ghi chú', 240, { mau: MAU.ghi }), C('nguon_tru', 'Nguồn', 130, { mau: MAU.xam, ct: '📎 File khoản trừ: từ file tạm ứng đã tải. Chưa tải file đó thì lấy từ phiếu lương.' })]);
  }
  /** So máy–file: một người từ kt_so_luong (day_du). Cột lệch do máy chủ tính, trang không tự so lại. */
  function dongSoNguoi(n, vt, stt) {
    var r = { ky: vt.ky, ky_ten: tenKy(vt.ky), ma_ct: vt.ma_ct, ten_ct: vt.ten_ct, dia: vt.dia, stt: stt, ho_ten: n.ten, cccd_nm: n.cccd || '', tuyen: n.tuyen || '', _pid: vt.ma_ct + '|' + vt.ky + '|' + n.cccd, so_lech: 0, chi: n.chi === 'may' ? 'Chỉ máy có' : n.chi === 'file' ? 'Chỉ file có' : '' };
    Object.keys(n.o).forEach(function (k) {
      var x = n.o[k];
      r['m_' + k] = x.may; r['f_' + k] = x.file; r['l_' + k] = x.lech;
      if (x.lech !== '' && x.lech != null) r.so_lech++;
    });
    return r;
  }
  function cotSo(oTen, mot) {
    var d = MAU.duong, cot = cotThang(mot).concat([C('stt', 'STT', 40, { mau: d, giua: 1 }), C('ma_ct', 'Công ty', 84, { mau: d, giua: 1 }), C('ho_ten', 'Họ và tên', 186, { mau: d, dam: 1 }),
      C('cccd_nm', 'CCCD', 108, { mau: d, giua: 1, n: 'hs' }), C('tuyen', 'Người tuyển', 90, { mau: d, giua: 1, n: 'hs' }),
      C('so_lech', 'Số ô lệch', 56, { mau: MAU.hong, kieu: 'dem', tong: 1, lop: function (r) { return r.so_lech ? 'o-sai' : ''; } }), C('chi', 'Chỉ có một bên', 96, { mau: MAU.hong, lop: function (r) { return r.chi ? 'o-sai' : ''; } })]);
    oTen.forEach(function (x) {
      var k = x[0], nh = O_CHINH.indexOf(k) >= 0 ? '' : O_PC.indexOf(k) >= 0 ? 'pc' : 'tru', them = nh ? { n: nh } : {};
      cot.push(C('m_' + k, [x[1], 'Máy'], 94, Object.assign({ mau: MAU.la, kieu: 'tien', tong: k !== 'ky_nhan' }, them)));
      cot.push(C('f_' + k, [x[1], 'File'], 94, Object.assign({ mau: MAU.cam, kieu: 'tien', tong: k !== 'ky_nhan' }, them)));
      cot.push(C('l_' + k, [x[1], 'Lệch'], 84, Object.assign({ mau: MAU.hong, kieu: 'tien', tong: k !== 'ky_nhan', ct: 'Máy trừ File, đã làm tròn đồng. Trống là khớp.', lop: function (r) { var v = r['l_' + k]; return v !== '' && v != null ? 'o-sai' : ''; } }, them)));
    });
    return cot;
  }

  // ================== TRẠNG THÁI TRANG ==================
  var S = { trang: 'viec', tg: null, mo: { tg: true, o: true, ai: false, tt: false, dia: true }, moCay: {}, ct: {}, moDia: {}, timCT: '', tim: '', tuyen: {}, gop: {}, chk: {}, an: {}, gonBen: false, lui: [], moNgan: null, phMo: null, diaN: {} };
  var KHO = {}, LOI = {}, DANG = {}, KHO_SO = {}, KHO_SS = {}, KHO_SUA = {}, DA_HOI = {}, LOI_SO = '', dangLay = null, lanVe = 0;
  var luoi = null, luoiTai = null, TAI = null, daDung = false, dangChuyen = false, BAT = null, tgDaDat = false, henBao = 0;

  function manRong() { return !!(window.matchMedia && window.matchMedia('(min-width: 1001px)').matches); }
  function dangBat() { if (BAT === null) BAT = manRong() && doc(KHOA_KIEU) !== 'the'; return BAT; }
  function thangNay() { var h = trangThai.luoi && trangThai.luoi.hom_nay; if (h) return h.substring(0, 7); var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function congTy() { return (trangThai.luoi && trangThai.luoi.cong_ty) || (ph.ds && ph.ds.cong_ty) || []; }   // Quản lý, Trưởng nhóm không gọi được kt_luoi: lấy công ty từ phiếu
  function cacCT() { var ds = Object.keys(S.ct); return congTy().filter(function (c) { return !ds.length || S.ct[c.ma_ct]; }); }
  function trongLuoi(c, ky) { return c.ky.filter(function (k) { return k.ky === ky; })[0]; }
  function kySau(ky) { var y = +ky.substring(0, 4), m = +ky.substring(5, 7) + 1; if (m > 12) { y++; m = 1; } return y + '-' + ('0' + m).slice(-2); }
  function cacThang() {
    if (!S.tg) return [];
    var ra = [], t = S.tg.a, cuoi = S.tg.b < thangNay() ? S.tg.b : thangNay();
    while (t <= cuoi && ra.length < 36) { ra.push(t); t = kySau(t); }
    return ra;
  }
  function tenMoc() { var t = cacThang(); return !t.length ? 'Chưa chọn tháng' : t.length === 1 ? 'Tháng ' + tenKy(t[0]) : 'Tháng ' + tenKy(t[0]) + ' → ' + tenKy(t[t.length - 1]); }
  function coSo() { return coCV('ke_toan', 'quan_tri'); }
  function coTien() { return coCV('xem_luong', 'ke_toan', 'quan_tri'); }
  function baoNhanh(cau) {
    var b = $('klBao'); if (!b) return;
    b.textContent = cau; b.hidden = false;
    clearTimeout(henBao);
    henBao = setTimeout(function () { b.hidden = true; }, /^⏳/.test(cau) ? 60000 : 5000);
  }
  /** Chữ thuần từ dòng 👉 của ô tháng: cùng một câu với kiểu thẻ, không viết hai nơi. */
  function chuTuHtml(h) { return String(h || '').replace(/<br\s*\/?>/gi, ' · ').replace(/<[^>]+>/g, '').replace(/👉\s*/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim(); }
  function tinhTrangLuong(k) { return k.thang_chot_luc ? '🔒 Đã chốt tháng' : daCB(k, 'luong') ? '📢 Đã công bố' : (k.cb_luong_phien || 0) > 0 ? '⚠ Đang hiện bản cũ' : '📝 Bản nháp'; }

  // ================== LẤY SỐ ==================
  /** Công ty × tháng cần gọi máy chủ: có số trong bản đang giữ mà trang chưa có, hoặc bản đã đổi. */
  function canLay(p) {
    var ds = [];
    cacThang().forEach(function (ky) {
      cacCT().forEach(function (c) {
        var k = trongLuoi(c, ky), kh = c.ma_ct + '|' + ky;
        if (p.can === 'so') {                                         // nguồn máy: phiếu chính là số máy, so nhau luôn "khớp" là báo giả, nên không so
          kh = 'so|' + kh;
          if (!k || !k.may || k.nguon_luong !== 'file') return;
          if ((KHO_SS[kh] && KHO_SS[kh].pb === k.phien_ban) || LOI[kh] || DANG[kh]) return;
          ds.push({ c: c, ky: ky, kh: kh, pb: k.phien_ban });
          return;
        }
        if (!k || !k.co_file || (p.can === 'luong' && !k.co_luong)) return;
        if ((KHO[kh] && KHO[kh].pb === k.phien_ban) || LOI[kh] || DANG[kh]) return;
        ds.push({ c: c, ky: ky, kh: kh, pb: k.phien_ban });
      });
    });
    return ds;
  }
  /** Tháng phải hỏi sổ lưu trữ: có công ty không còn bản trên lưới. Chỉ Kế toán, Quản trị đọc được sổ. Mỗi lần xem tối đa 12 tháng như máy chủ. */
  function thangHoiSo() {
    if (!coSo()) return [];
    var ct = cacCT();
    return cacThang().filter(function (ky) {
      return !(ky in KHO_SO) && ct.some(function (c) { var k = trongLuoi(c, ky); return !k || !k.co_file; });
    }).slice(-12);
  }
  function layThem(p) {
    var ds = canLay(p), so = p.can === 'so' ? [] : thangHoiSo();
    if (!ds.length && !so.length) return;
    var tong = ds.length + (so.length ? 1 : 0), xong = 0, i = 0;
    dangLay = dangLay || { xong: 0, tong: 0 };
    dangLay.tong += tong;
    ds.forEach(function (x) { DANG[x.kh] = 1; });
    function motCu(x) {
      var laSo = p.can === 'so';
      return goi(laSo ? { hanh_dong: 'kt_so_luong', phien: trangThai.phien, ma_ct: x.c.ma_ct, ky: x.ky, day_du: true } : { hanh_dong: 'kt_doc_thang', phien: trangThai.phien, ma_ct: x.c.ma_ct, ky: x.ky }, 120).then(function (kq) {
        delete DANG[x.kh];
        if (kq.ok && laSo) { kq.pb = x.pb; kq.canh = kq.canh_bao || ''; KHO_SS[x.kh] = kq; }
        else if (kq.ok) KHO[x.kh] = { pb: kq.phien_ban, nguoi: kq.nguoi, nguon: kq.nguon_luong, canh: kq.canh_bao || '', tru: kq.khoan_tru };
        else LOI[x.kh] = { ten: x.c.ten, cau: kq.ma === 'KHONG_RO' ? 'máy chủ chưa lên bản mới' : kq.loi };
      });
    }
    function tho() {
      if (i >= ds.length) return Promise.resolve();
      var x = ds[i++];
      return motCu(x).then(function () { motXong(); return tho(); });
    }
    function motXong() {
      xong++; if (dangLay) dangLay.xong++;
      veTien();
      if (Date.now() - lanVe > 2500) veBang(true);
    }
    var chay = [tho(), tho(), tho(), tho()];
    if (so.length) {
      chay.push(goi({ hanh_dong: 'kt_so_doc', phien: trangThai.phien, tu: so[0], den: so[so.length - 1] }, 120).then(function (kq) {
        var t = so[0];
        while (t <= so[so.length - 1]) { KHO_SO[t] = []; t = kySau(t); }
        if (!kq.ok) { LOI_SO = kq.loi; return; }
        LOI_SO = '';
        kq.dong.forEach(function (h) {
          var o = {}; kq.cot.forEach(function (c, j) { o[c] = h[j]; });
          (KHO_SO[o.ky] = KHO_SO[o.ky] || []).push(o);
        });
        motXong();
      }));
    }
    veTien();
    Promise.all(chay).then(function () {
      if (dangLay && dangLay.xong >= dangLay.tong) dangLay = null;
      veTrang(true);
    });
  }
  /** Duyệt mọi người đã có theo tháng + công ty đang chọn. Bản trên lưới trước; không còn bản thì lấy từ sổ. */
  function duyetNguoi(moiNguoi) {
    cacThang().forEach(function (ky) {
      cacCT().forEach(function (c) {
        var k = trongLuoi(c, ky), kh = c.ma_ct + '|' + ky;
        if (k && k.co_file) {
          var o = KHO[kh]; if (!o) return;
          var vt = { ky: ky, ma_ct: c.ma_ct, ten_ct: c.ten, dia: c.dia_ban, nguon: o.nguon === 'may' ? '🧮 Máy' : o.nguon === 'file' ? '📄 File' : '', tinh_trang: tinhTrangLuong(k) };
          o.nguoi.forEach(function (n, i) { moiNguoi(n, vt, i + 1); });
        } else {
          var vs = { ky: ky, ma_ct: c.ma_ct, ten_ct: c.ten, dia: c.dia_ban, tinh_trang: '📚 Trong sổ' };
          (KHO_SO[ky] || []).filter(function (s) { return s.ma_ct === c.ma_ct; }).forEach(function (s, i) {
            vs.nguon = s.nguon_luong === 'may' ? '🧮 Máy' : '📄 File';
            s._n = s._n || nguoiTuSo(s);
            moiNguoi(s._n, vs, i + 1);
          });
        }
      });
    });
  }

  // ================== CÁC TRANG ==================
  var TRANG = {};
  TRANG.viec = {
    ten: '📋 Việc tháng', mau: MAU.luc, ben: ['tg', 'o', 'tt'], bang: 3, ten_tep: 'Viec thang',
    quyen: ['hanh_chinh', 'xem_luong', 'ke_toan', 'quan_tri'],
    chi: '👉 Mỗi công ty × tháng một dòng. Bấm <b>📂 Mở</b> ở đầu dòng để tải file, công bố, chốt. Cột <b>Việc kế tiếp</b> nói việc cần làm.',
    rong: 'Tài khoản chưa được giao công ty nào, hoặc chưa chọn tháng. Báo người quản trị nếu thiếu công ty.',
    cot: function () {
      var x2 = MAU.xam2, mot = cacThang().length <= 1;
      return cotThang(mot).concat([
        C('ten_ct', 'Công ty', 240, { mau: MAU.duong, dam: 1 }), C('_mo', 'Mở', 70, { mau: MAU.duong, ve: function (r, i) { return '<button type="button" class="mo-viec" data-mo="' + i + '">📂 Mở</button>'; }, chep: false }),
        C('viec', 'Việc kế tiếp', 330, { mau: MAU.vang2, ct: 'Câu này đổi theo chức vụ đang đăng nhập.' }), C('ma_ct', 'Mã', 86, { mau: MAU.duong, giua: 1 }), C('dia', 'Địa bàn', 90, { mau: MAU.duong, giua: 1 }),
        C('cong_tt', ['🗓 Bảng công', 'Tình trạng'], 150, { mau: x2 }), C('cong_n', ['🗓 Bảng công', 'Số người'], 56, { mau: x2, kieu: 'dem', tong: 1 }), C('cong_cb', ['🗓 Bảng công', 'Công nhân xem'], 118, { mau: x2, giua: 1 }),
        C('qt', ['Thiết lập', 'Quy tắc'], 66, { mau: MAU.la, giua: 1 }), C('nguong', ['Thiết lập', 'Ngưỡng công'], 66, { mau: MAU.la, giua: 1 }),
        C('tu_n', ['➖ Khoản trừ', 'Số người'], 56, { mau: MAU.nhat, kieu: 'dem', tong: 1, tien: 1 }), C('tu_tien', ['➖ Khoản trừ', 'Tổng tiền'], 96, { mau: MAU.nhat, kieu: 'tien', tong: 1, tien: 1 }),
        C('nguon', ['💵 Lương', 'Nguồn'], 68, { mau: MAU.cam, giua: 1, tien: 1 }), C('l_n', ['💵 Lương', 'Số người'], 56, { mau: MAU.cam, kieu: 'dem', tong: 1, tien: 1 }),
        C('l_thuc', ['💵 Lương', 'Tổng thực lĩnh'], 112, { mau: MAU.cam, kieu: 'tien', tong: 1, tien: 1, dam: 1 }), C('l_cb', ['💵 Lương', 'Công nhân xem'], 118, { mau: MAU.cam, giua: 1, tien: 1 }),
        C('chot', '🔒 Chốt tháng', 96, { mau: MAU.luc, giua: 1, tien: 1 }), C('ph', '💬 Phản hồi mở', 62, { mau: MAU.ghi, kieu: 'dem', tong: 1, chiPH: 1 })
      ]);
    },
    dong: function () {
      var ra = [], chon = Object.keys(S.ct);
      cacThang().forEach(function (ky) {
        congTy().forEach(function (c, i) {
          if (chon.length && !S.ct[c.ma_ct]) return;
          var k = trongLuoi(c, ky);
          if (!k) { k = { ky: ky, co_file: false }; c.ky.push(k); }   // như nút mở tháng cũ: ô rỗng trên trang, lưu file xong máy chủ mới ghi tháng đó
          var j = c.ky.indexOf(k), co = c.ky.filter(function (x) { return x.co_file; });
          var quaGiu = !k.co_file && co.length >= GIU_KY && co.every(function (x) { return x.ky > ky; });
          var chot = (k.cong_chot_phien || 0) > 0, tu = k.tu;
          ra.push({
            ky: ky, ky_ten: tenKy(ky), ma_ct: c.ma_ct, ten_ct: c.ten, dia: c.dia_ban, _i: i, _j: j, _k: k, _pid: c.ma_ct + '|' + ky,
            viec: quaGiu ? 'Tháng này đã qua ' + GIU_KY + ' tháng giữ lại: số đã chốt nằm ở tab 3.Bảng lương' : chuTuHtml(viecKe(k, i)),
            cong_tt: !k.co_file ? '📄 Chưa có' : chot ? '🔒 Đã chốt' : '📝 Đã tải, chưa chốt', cong_n: k.co_file ? k.cong_so_nguoi : '',
            cong_cb: !k.co_file ? '' : daCB(k, 'cong') ? '✅ Đã xem được' : (k.cb_cong_phien || 0) > 0 ? '⚠ Đang hiện bản cũ' : '⏳ Chưa',
            qt: k.co_quy_tac == null ? '' : k.co_quy_tac ? '✅ Có' : '⚠ Chưa có', nguong: c.nguong_ok == null ? '' : c.nguong_ok ? '✅ Có' : '⚠ Thiếu',
            tu_n: tu ? tu.so_nguoi : '', tu_tien: tu ? (tu.tam_ung || 0) + (tu.luu_dong || 0) + (tu.giam_tru || 0) : '',
            nguon: k.nguon_luong === 'may' ? '🧮 Máy' : k.nguon_luong === 'file' ? '📄 File' : '', l_n: k.co_luong ? k.so_nguoi : '', l_thuc: k.co_luong && k.tong_thuc_linh != null ? k.tong_thuc_linh : '',
            l_cb: !k.co_luong ? '' : daCB(k, 'luong') ? '✅ Đã xem được' : (k.cb_luong_phien || 0) > 0 ? '⚠ Đang hiện bản cũ' : '⏳ Chưa',
            chot: k.thang_chot_luc ? '🔒 Đã chốt' : k.co_luong ? 'Chưa' : '', ph: k.so_ph == null ? '' : k.so_ph
          });
        });
      });
      return ra;
    },
    chk: [{ k: 'con', ten: 'Chỉ dòng còn việc', khop: function (r) { return !!r.viec; } }, { k: 'chua_cong', ten: 'Chưa có bảng công', khop: function (r) { return !r._k.co_file; } },
          { k: 'chua_thang', ten: 'Có lương, chưa chốt tháng', khop: function (r) { return r._k.co_luong && !r._k.thang_chot_luc; } }],
    tom: function (ds) {
      return { chu: tenMoc() + ' · <span class="so">' + ds.length + '</span> dòng', chip: [['con', ds.filter(function (r) { return r.viec; }).length + ' dòng còn việc'],
        ['chua_cong', ds.filter(function (r) { return !r._k.co_file; }).length + ' chưa có bảng công'], ['chua_thang', ds.filter(function (r) { return r._k.co_luong && !r._k.thang_chot_luc; }).length + ' chưa chốt tháng']] };
    },
    mo: function (r) { moViec(r); }
  };
  function soCtCo(p) {
    var co = {};
    duyetNguoi(function (n, vt) { if (p.can !== 'luong' || n.luong) co[vt.ma_ct + '|' + vt.ky] = 1; });
    return Object.keys(co).length;
  }
  TRANG.cong = {
    ten: '🗓 1.Bảng công', mau: '#FF0000', ben: ['tg', 'o', 'ai', 'tt'], bang: 4, can: 'cong', ten_tep: 'Bang cong',
    quyen: ['hanh_chinh', 'xem_luong', 'ke_toan', 'quan_tri'],
    chi: '👉 Cùng khuôn với trang <b>1.Chấm công</b> của file. Lọc ở cột trái hoặc bấm <b>▾</b> trên tiêu đề cột. Bấm tên để xem một người. Muốn sửa số thì sửa file rồi tải lại ở Việc tháng.',
    rong: 'Tháng và công ty đang chọn chưa có bảng công.',
    gop: [['', 'Từng dòng ca (như file)'], ['nguoi', 'Từng người'], ['ma_ct', 'Công ty'], ['dia', 'Địa bàn'], ['tuyen', 'Người tuyển'], ['ky', 'Tháng']],
    nhomCot: [['hs', 'Hồ sơ đầy đủ (mã code, CCCD thực, ngày sinh…)'], ['ngay', 'Từng ngày'], ['dem', 'Cột đếm NP, KP…']],
    anSan: { hs: true },
    cot: function (ds) { return cotCong(ds, cacThang().length <= 1); },
    cotGop: cotCongGop,
    dong: function () { var ra = []; duyetNguoi(function (n, vt, i) { dongCongNguoi(n, vt, i).forEach(function (r) { ra.push(r); }); }); return ra; },
    dongGop: function () { var ra = []; duyetNguoi(function (n, vt, i) { ra.push(dongCongGop(n, vt, i)); }); return ra; },
    chk: [{ k: 'moi', ten: 'Người mới trong kỳ', khop: function (r) { return r._moi; } }, { k: 'kp', ten: 'Có nghỉ không phép', khop: function (r) { return r._kp; } }],
    ghi: function () {
      var t = cacThang();
      if (t.length > 1) return 'Đang chọn nhiều tháng nên ẩn từng ngày. Chọn một tháng để xem từng ngày.';
      var tuSo = t.length && cacCT().some(function (c) { var k = trongLuoi(c, t[0]); return (!k || !k.co_file) && (KHO_SO[t[0]] || []).some(function (s) { return s.ma_ct === c.ma_ct; }); });
      return tuSo ? 'Tháng ' + tenKy(t[0]) + ' có công ty lấy từ sổ lưu trữ: sổ giữ tổng giờ từng ca, không giữ từng ngày.' : '';
    },
    tom: function (ds) {
      var id = {}, g = 0, moi = {}, kp = {};
      ds.forEach(function (r) { id[r._pid] = 1; g += r.tong || 0; if (r._moi) moi[r._pid] = 1; if (r._kp) kp[r._pid] = 1; });
      return { chu: tenMoc() + ' · <span class="so">' + soCtCo(this) + '</span>/' + cacCT().length + ' công ty có số · <span class="so">' + Object.keys(id).length.toLocaleString('vi-VN') + '</span> người · <span class="so">' + L.soVN(g) + '</span> giờ',
               chip: [['moi', Object.keys(moi).length + ' người mới'], ['kp', Object.keys(kp).length + ' người nghỉ không phép']] };
    },
    mo: function (r) { moNguoi(r); }
  };
  TRANG.luong = {
    ten: '💵 3.Bảng lương', mau: MAU.duong, ben: ['tg', 'o', 'ai', 'tt'], bang: 3, can: 'luong', ten_tep: 'Bang luong',
    quyen: ['xem_luong', 'ke_toan', 'quan_tri'],
    chi: '👉 Cùng khuôn với trang <b>2.Bảng lương</b>, màu tiêu đề giữ như file. Chọn tháng cũ ở cột trái là ra số trong sổ lưu trữ. Bấm tên để xem phiếu lương.',
    rong: 'Tháng và công ty đang chọn chưa có phiếu lương.',
    gop: [['', 'Từng người (như file)'], ['ma_ct', 'Công ty'], ['dia', 'Địa bàn'], ['tuyen', 'Người tuyển'], ['ky', 'Tháng']],
    nhomCot: [['hs', 'Mã code, CCCD, người tuyển, ngày vào'], ['cong', 'Tổng hợp ngày công'], ['cb', 'Lương CB, đơn giá'], ['gio', 'Số giờ công'], ['tien', 'Tiền lương theo giờ'], ['pc', 'Phụ cấp, hỗ trợ'], ['tru', 'Giảm trừ'], ['dem', 'Ý thức làm việc (NP, KP…)'], ['ngu', 'Nguồn, tình trạng']],
    anSan: {},
    cot: function (ds) { return cotLuong(ds, cacThang().length <= 1); },
    dong: function () { var ra = []; duyetNguoi(function (n, vt, i) { var r = dongLuongNguoi(n, vt, i); if (r) ra.push(r); }); return ra; },
    chk: [{ k: 'ktt', ten: 'Ký nhận KTT', khop: function (r) { return r.ky_nhan === 'KTT'; } }, { k: 'am', ten: 'Thực lĩnh âm', khop: function (r) { return r.thuc_linh < 0; } },
          { k: 'tu', ten: 'Có tạm ứng', khop: function (r) { return r.tam_ung > 0; } }, { k: 'ld', ten: 'Có lưu động', khop: function (r) { return r.luu_dong > 0; } }, { k: 'moi', ten: 'Người mới trong kỳ', khop: function (r) { return r._moi; } }],
    ghi: function () {
      var r = [], them = false;
      duyetNguoi(function (n) { if (n.luong && n.them && Object.keys(n.them).length) them = true; if (n.luong && !n.them) r.push(1); });
      var ra = r.length ? 'Có ' + r.length.toLocaleString('vi-VN') + ' người trong file tải trước bản giữ thêm cột: các cột Tổng công, Lương CB, Đơn giá… để trống, tải lại file mới có.' : '';
      if (!coSo() && cacThang().some(function (ky) { return cacCT().some(function (c) { var k = trongLuoi(c, ky); return !k || !k.co_file; }); })) ra += (ra ? ' ' : '') + 'Chức vụ Xem lương chỉ xem được các tháng gần nhất, không xem sổ lưu trữ.';
      return ra;
    },
    tom: function (ds) {
      var t = 0, l = 0;
      ds.forEach(function (r) { t += r.tong_luong_pc || 0; l += r.thuc_linh || 0; });
      return { chu: tenMoc() + ' · <span class="so">' + soCtCo(this) + '</span>/' + cacCT().length + ' công ty có phiếu · <span class="so">' + ds.length.toLocaleString('vi-VN') + '</span> người · Tổng lương + phụ cấp <span class="so">' + L.tienVN(t) + '</span> đ · Thực lĩnh <span class="so">' + L.tienVN(l) + '</span> đ',
               chip: [['ktt', ds.filter(function (r) { return r.ky_nhan === 'KTT'; }).length + ' người KTT'], ['am', ds.filter(function (r) { return r.thuc_linh < 0; }).length + ' người âm'], ['tu', ds.filter(function (r) { return r.tam_ung > 0; }).length + ' có tạm ứng']] };
    },
    mo: function (r) { moNguoi(r); }
  };
  // ---- ➖ 2.Khoản trừ (vé 08) ----
  TRANG.tru = {
    ten: '➖ 2.Khoản trừ', mau: MAU.nhat, ben: ['tg', 'o', 'ai', 'tt'], bang: 3, can: 'cong', ten_tep: 'Khoan tru',
    quyen: ['xem_luong', 'ke_toan', 'quan_tri'],
    chi: '👉 Tạm ứng, lưu động, giảm trừ khác của từng người, xem được cả khi chưa có lương. Muốn thay thì mở ô tháng ở <b>Việc tháng</b>, bấm <b>📎 Tải file tạm ứng</b>: file mới thay trọn file cũ.',
    rong: 'Tháng và công ty đang chọn không có khoản trừ nào.',
    gop: [['', 'Từng người'], ['ma_ct', 'Công ty'], ['dia', 'Địa bàn'], ['tuyen', 'Người tuyển'], ['ky', 'Tháng']],
    cot: function () { return cotTru(cacThang().length <= 1); },
    dong: function () {
      var ra = [], daCo = {};
      duyetNguoi(function (n, vt) {
        var kh = vt.ma_ct + '|' + vt.ky, tu = KHO[kh] && KHO[kh].tru, coFile = tu && Object.keys(tu).length, x = coFile ? tu[n.cccd_nha_may] : null, nguon = '📎 File khoản trừ';
        if (coFile) daCo[kh + '|' + n.cccd_nha_may] = 1;
        else if (n.luong) { var l = dongLuongNguoi(n, vt, 0); x = { tam_ung: l.tam_ung, luu_dong: l.luu_dong, giam_tru_khac: l.giam_khac, ghi_chu: '' }; nguon = vt.nguon + ' lương'; }
        if (x && (x.tam_ung || x.luu_dong || x.giam_tru_khac)) ra.push(dongTru(n, vt, ra.length + 1, x, nguon));
      });
      // Khoản trừ của người không còn trong bảng công (bảng công đã thay sau khi tải file): vẫn hiện, không để tổng thiếu lặng lẽ
      cacThang().forEach(function (ky) {
        cacCT().forEach(function (c) {
          var kh = c.ma_ct + '|' + ky, tu = KHO[kh] && KHO[kh].tru;
          Object.keys(tu || {}).forEach(function (cc) {
            if (!daCo[kh + '|' + cc]) ra.push(dongTru({ cccd_nha_may: cc, ten_hien: '(không còn trong bảng công)' }, { ky: ky, ma_ct: c.ma_ct, ten_ct: c.ten, dia: c.dia_ban }, ra.length + 1, tu[cc], '📎 File khoản trừ'));
          });
        });
      });
      return ra;
    },
    chk: [{ k: 'tu', ten: 'Có tạm ứng', khop: function (r) { return r.tam_ung > 0; } }, { k: 'ld', ten: 'Có lưu động', khop: function (r) { return r.luu_dong > 0; } }, { k: 'gk', ten: 'Có giảm trừ khác', khop: function (r) { return r.giam_khac > 0; } }],
    tom: function (ds) {
      var t = 0, u = 0;
      ds.forEach(function (r) { t += r.tong_tru; u += r.tam_ung; });
      return { chu: tenMoc() + ' · <span class="so">' + ds.length.toLocaleString('vi-VN') + '</span> người có khoản trừ · Tổng trừ <span class="so">' + L.tienVN(t) + '</span> đ · Tạm ứng <span class="so">' + L.tienVN(u) + '</span> đ', chip: [] };
    },
    mo: function (r) { moNguoi(r); }
  };
  // ---- ⚖ 4.So máy–file (vé 08) ----
  var O_CHINH = ['tien_gio', 'tong_pc', 'tong_luong_pc', 'giam_tru', 'thuc_linh', 'ky_nhan'], O_PC = ['cc', 'xang', 'nha', 'tham_nien', 'an'];
  function dongSoCua(fn) {
    cacThang().forEach(function (ky) {
      cacCT().forEach(function (c) {
        var o = KHO_SS['so|' + c.ma_ct + '|' + ky];
        if (o) fn(o, { ky: ky, ma_ct: c.ma_ct, ten_ct: c.ten, dia: c.dia_ban });
      });
    });
  }
  TRANG.so = {
    ten: '⚖ 4.So máy–file', mau: '#7030A0', ben: ['tg', 'o', 'tt'], bang: 3, can: 'so', ten_tep: 'So may file',
    quyen: ['xem_luong', 'ke_toan', 'quan_tri'],
    chi: '👉 Mỗi người mỗi khoản có 3 ô: <b>Máy</b>, <b>File</b>, <b>Lệch</b> (máy trừ file). Ô lệch tô đỏ kèm số. Công nhân vẫn xem theo file kế toán, trang này chỉ để so.',
    rong: 'Tháng và công ty đang chọn chưa có gì để so. Cần có cả 🧮 số máy và 📄 file lương của kế toán.',
    gop: [['', 'Từng người'], ['ma_ct', 'Công ty'], ['dia', 'Địa bàn'], ['ky', 'Tháng']],
    nhomCot: [['hs', 'CCCD, người tuyển'], ['pc', 'Từng khoản phụ cấp'], ['tru', 'Tạm ứng, lưu động, giảm trừ khác']],
    anSan: { hs: true, pc: true, tru: true },
    cot: function () { return cotSo(this.oTen(), cacThang().length <= 1); },
    oTen: function () { var ra = null; dongSoCua(function (o) { ra = ra || o.o_ten; }); return ra || []; },
    dong: function () {
      var ra = [];
      dongSoCua(function (o, vt) { (o.ds || []).forEach(function (n, i) { ra.push(dongSoNguoi(n, vt, i + 1)); }); });
      return ra;
    },
    chk: [{ k: 'lech', ten: 'Chỉ dòng lệch', khop: function (r) { return r.so_lech > 0 || !!r.chi; } }],
    ghi: function () {
      var dungMay = [], chuaTinh = [], cu = [], an = S.an.so || this.anSan, oAn = 0, ra = [];
      cacThang().forEach(function (ky) {
        cacCT().forEach(function (c) {
          var k = trongLuoi(c, ky), ten = c.ten + ' ' + tenKy(ky);
          if (!k || !k.co_luong) return;
          if (k.nguon_luong === 'may') dungMay.push(ten);
          else if (!k.may) chuaTinh.push(ten);
          else if (k.may.cu) cu.push(ten);
        });
      });
      if (dungMay.length) ra.push('Chưa so được: ' + dungMay.join(', ') + ' (đang dùng số máy, chưa có file lương của kế toán để so).');
      if (chuaTinh.length) ra.push('Chưa so được: ' + chuaTinh.join(', ') + ' (máy chưa tính lương).');
      if (cu.length) ra.push('⚠ Số máy đã cũ, nên tính lại trước: ' + cu.join(', ') + '.');
      this.dong().forEach(function (r) {
        O_PC.concat(['tam_ung', 'luu_dong', 'giam_khac']).forEach(function (k) { if (r['l_' + k] !== '' && r['l_' + k] != null && an[O_PC.indexOf(k) >= 0 ? 'pc' : 'tru']) oAn++; });
      });
      if (oAn) ra.push('Có ' + oAn + ' ô lệch nằm ở nhóm cột đang ẩn: bấm ☰ Chọn cột để xem.');
      return ra.join(' ');
    },
    tom: function (ds) {
      var khop = 0, tong = 0, lech = 0, chi = 0;
      dongSoCua(function (o) { khop += o.khop; tong += o.tong; lech += o.lech.length; chi += o.chi_may.length + o.chi_file.length; });
      return { chu: tenMoc() + ' · Khớp <span class="so">' + khop + '</span>/' + tong + ' người · <span class="so">' + lech + '</span> người lệch' + (chi ? ' · <span class="so">' + chi + '</span> người chỉ có một bên' : ''),
               chip: [['lech', ds.filter(function (r) { return r.so_lech > 0 || r.chi; }).length + ' dòng lệch']] };
    }
  };
  // ---- 📊 5.Tháng N (vé 09): cùng khuôn + cùng chữ cái cột với file Tháng 8 ----
  var RONG_N = { A: 40, B: 66, C: 66, D: 108, E: 90, F: 170, G: 84, H: 84, I: 92, J: 92, K: 70, T: 66, U: 112, V: 60, W: 66, X: 66, Y: 66, Z: 84, AA: 72, AB: 104, AC: 76, AD: 104, AE: 80, AF: 72, AG: 66, AH: 58, AI: 72, AJ: 170, AK: 66, AL: 66 };
  var KIEU_N = { T: 'gio', W: 'gio', X: 'gio', Y: 'gio', AD: 'tien', AK: 'gio', AL: 'gio', G: 'ngay', H: 'ngay', Z: 'ngay' };
  'LMNOPQRS'.split('').forEach(function (c) { RONG_N[c] = 58; KIEU_N[c] = 'gio'; });
  var AN_N = { B: 1, C: 1, E: 1, G: 1, I: 1, K: 1 }, TONG_N = ['L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'AD'];
  /** Màu tiêu đề theo chữ cái cột của file Tháng 8. */
  function mauN(c, i) {
    if (c === 'A' || c === 'AJ' || c === 'AK' || c === 'AL') return '#FFFFFF';
    if (i <= 10 || c === 'AA' || c === 'AH') return MAU.xam;
    if (c === 'AB' || c === 'AC') return MAU.vang2;
    if (c === 'AI') return MAU.la;
    return '#2E75B5';
  }
  function dongN(tr, it, d, id) {
    var r = {};
    COT_N.forEach(function (c) { r[c] = d[c] == null ? '' : d[c]; });
    r.AB = datTen(d.AB) + (d.ly_do_sua ? ' ✏️' : '');
    r.ho_ten = d.F; r.cccd_nm = d.D; r.tuyen = d.J; r._pid = d.ma_ct + '|' + d.nm; r._d = d; r._it = it; r._id = id;
    return r;
  }
  function tenDiaN(tr) { return tr.dia_ban || tr.ten; }
  /** Một trang đúng vị trí dòng + cột Tháng 8.xlsx: dòng 1 tiêu đề, 2 tổng, 3 Ngày/Đêm, dữ liệu từ dòng 4. Tổng là SUBTOTAL để lọc tiếp trong Excel vẫn đúng. */
  function ghiThangN(wb, tr) {
    var ws = wb.addWorksheet(String(tr.ten).replace(/[\\\/?*\[\]:]/g, ' ').substring(0, 31)), hang = hangThangN(tr, thn.kq.thang), n = tr.dong.length;
    var vien = { style: 'thin', color: { argb: 'FF808080' } }, bonVien = { top: vien, left: vien, bottom: vien, right: vien };
    var phong = { name: 'Times New Roman', size: 11 }, dam = { name: 'Times New Roman', size: 11, bold: true };
    var to = function (x, m) { x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + m.replace('#', '') } }; };
    ws.columns = COT_N.map(function (c) { return { width: Math.max(5, Math.round(RONG_N[c] / 6.2)) }; });
    ws.getRow(1).height = 60;
    hang.forEach(function (h, i) {
      h.forEach(function (v, j) {
        var c = COT_N[j], x = ws.getCell(i + 1, j + 1);
        x.border = bonVien; x.font = i < 3 ? dam : phong;
        if (i === 0) { to(x, mauN(c, j)); x.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; }
        if (i === 1) {
          to(x, c === 'V' ? MAU.cam2 : (c === 'W' || c === 'X' || c === 'Y') ? MAU.la : MAU.vang);
          if (TONG_N.indexOf(c) >= 0) { x.value = n ? { formula: 'SUBTOTAL(9,' + c + '4:' + c + (3 + n) + ')', result: v === '' ? 0 : v } : null; x.numFmt = c === 'AD' ? '#,##0' : 'General'; return; }
        }
        if (i === 2) to(x, '#00B0F0');
        if (v === '' || v == null) return;
        x.value = v;
        if (i >= 3) x.numFmt = KIEU_N[c] === 'ngay' && typeof v === 'number' ? 'dd/mm/yyyy' : c === 'AD' ? '#,##0' : typeof v === 'string' ? '@' : 'General';
      });
    });
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: COT_N.length } };
    ws.views = [{ state: 'frozen', xSplit: 6, ySplit: 3 }];
    return ws;
  }
  function suaDatLuoi(r) {
    var d = r._d, dat = '', ly = '';
    hoi('<p><b>Sửa ô Đạt: ' + e(d.F) + '</b></p><p>' + e(d.cong_ty) + ' · Tổng công ' + soLe(d.W) + ' · Công gộp ' + soLe(d.X) + ' · Máy xét <b>' + datTen(d.AB_may) + '</b>' + (d.ly_do_sua ? ' · Đang sửa tay: ' + e(d.ly_do_sua) : '') + '</p>' +
        '<label for="klDat">Ô Đạt</label><select id="klDat"><option value="">Theo máy xét</option><option value="DAT"' + (d.ly_do_sua && d.AB === 'DAT' ? ' selected' : '') + '>✅ Đạt</option><option value="KHONG DAT"' + (d.ly_do_sua && d.AB !== 'DAT' ? ' selected' : '') + '>⏸ Không đạt</option></select>' +
        '<label for="klDatLy">Lý do (bắt buộc khi sửa tay)</label><textarea id="klDatLy" maxlength="300" placeholder="Ví dụ: nhà máy xác nhận đủ công">' + e(d.ly_do_sua || '') + '</textarea><div class="loi-o an" id="klDatLoi"></div>',
        '💾 Lưu ô Đạt', 'Thôi', function () {
          baoNhanh('⏳ Đang lưu ô Đạt của ' + d.F + '…');
          guiSuaDat(d, dat, ly, function (cau) { if (cau) bao('thnBao', 'do', '<b>Chưa lưu ô Đạt của ' + e(d.F) + '.</b> ' + e(cau)); baoNhanh(cau ? '⛔ Chưa lưu.' : '✅ Đã lưu ô Đạt.'); });
        }, null, function () {
          dat = $('klDat').value; ly = String($('klDatLy').value || '').trim();
          if (dat && !ly) { $('klDatLoi').textContent = 'Chưa ghi lý do: sửa tay ô Đạt thì phải biết vì sao.'; $('klDatLoi').classList.remove('an'); return false; }
          return true;
        });
  }
  TRANG.thangn = {
    ten: '📊 5.Tháng N', mau: MAU.vang, ben: ['tg', 'dia', 'ai', 'tt'], bangDen: 'F', ten_tep: 'Thang', quyen: ['ke_toan', 'quan_tri'],
    chi: '👉 Cùng khuôn và cùng chữ cái cột với file <b>Tháng 8</b>, gộp mọi công ty đã <b>🔒 chốt tháng</b>. Sai ô Đạt thì <b>bấm đúp ô AB</b> để sửa, phải ghi lý do.',
    rong: 'Tháng đang chọn chưa có công ty nào chốt tháng, hoặc đang gộp số.',
    nhomCot: [['hs', 'Mã NV, chức vụ, mã code, ngày sinh, điện thoại, team (cột B, C, E, G, I, K)']], anSan: { hs: true },
    bao: ['thnChua', 'thnCanh', 'thnBao'], rieng: 'thangn',
    truocVe: function () {
      var t = cacThang(), ky = t[t.length - 1];
      if (!ky || DA_HOI.thangn === ky) return;
      DA_HOI.thangn = ky; $('thnThang').value = ky; xemThangN();
    },
    cot: function () {
      var thang = cacThang().slice(-1)[0] || thangNay(), dau = hangThangN({ dong: [] }, thang);
      return COT_N.map(function (c, i) {
        var o = { chu: c, kieu: KIEU_N[c], tong: TONG_N.indexOf(c) >= 0, giua: KIEU_N[c] === 'ngay' || c === 'A' ? 1 : 0, dam: c === 'F' || c === 'T', mauT: [mauN(c, i), '#00B0F0'] };
        if (AN_N[c]) o.n = 'hs';
        if (c === 'AB') { o.suaRieng = true; o.ct = 'Bấm đúp để sửa, phải ghi lý do. Dấu ✏️ là ô đã sửa tay.'; o.lop = function (r) { return r._d.AB === 'DAT' ? '' : 'ma-do'; }; }
        var t2 = String(dau[2][i] || '').trim();
        return C(c, t2 ? [String(dau[0][i]).trim(), t2] : String(dau[0][i]).trim(), RONG_N[c] || 66, o);
      });
    },
    dong: function () {
      var ra = [], chon = Object.keys(S.diaN);
      ((thn.kq || {}).trang || []).forEach(function (tr, it) {
        if (chon.length && !S.diaN[tenDiaN(tr)]) return;
        tr.dong.forEach(function (d, id) { ra.push(dongN(tr, it, d, id)); });
      });
      return ra;
    },
    chk: [{ k: 'khong', ten: 'Không đạt', khop: function (r) { return r._d.AB !== 'DAT'; } }, { k: 'sua', ten: 'Đã sửa tay ô Đạt', khop: function (r) { return !!r._d.ly_do_sua; } }],
    ghi: function () { var t = cacThang(); return t.length > 1 ? 'Tháng N là file của một tháng: đang chọn nhiều tháng nên đang xem tháng cuối, ' + tenKy(t[t.length - 1]) + '.' : ''; },
    tom: function (ds) {
      var g = 0, tien1 = 0, dat = 0;
      ds.forEach(function (r) { g += Number(r.T) || 0; tien1 += Number(r.AD) || 0; if (r._d.AB === 'DAT') dat++; });
      return { chu: 'Tháng ' + (thn.kq ? tenKy(thn.kq.thang) : '…') + ' · <span class="so">' + ds.length.toLocaleString('vi-VN') + '</span> dòng · <span class="so">' + L.soVN(g) + '</span> giờ · <span class="so">' + dat + '</span> Đạt · Tiền phải trả CN <span class="so">' + L.tienVN(tien1) + '</span> đ',
               chip: [['khong', (ds.length - dat) + ' không đạt'], ['sua', ds.filter(function (r) { return r._d.ly_do_sua; }).length + ' đã sửa tay']] };
    },
    suaRieng: suaDatLuoi,
    tai: function () {
      var theo = {}, r = thn.kq;
      if (!r) return;
      luoi.dangXem().dong.forEach(function (x) { (theo[x._it] = theo[x._it] || []).push(x._d); });
      var cac = r.trang.map(function (tr, it) { return theo[it] ? { ten: tr.ten, dong: theo[it], ghi: ghiThangN } : null; }).filter(Boolean);
      if (!cac.length) { baoNhanh('Không có dòng nào để tải: bỏ bớt lọc rồi bấm lại.'); return; }
      L.taiTep(cac, 'Thang ' + Number(r.thang.substring(5, 7)) + '.' + r.thang.substring(0, 4) + '.xlsx', baoNhanh);
    }
  };
  // ---- ⏱ 6.Giờ tuyển dụng (vé 09): không có cột tiền ở cả màn và tệp ----
  function gioFile() { return gio.kq && gio.kq.ok; }
  TRANG.gio = {
    ten: '⏱ 6.Giờ tuyển dụng', mau: '#ED7D31', ben: function () { return gioFile() ? [] : ['tg']; }, bangDen: 'nm', ten_tep: 'Gio tuyen dung', quyen: ['ke_toan', 'quan_tri'],
    chi: '👉 Mỗi tháng × nhà máy một dòng, chỉ có giờ và Đạt, không tính tiền. Thêm tháng mới: chọn <b>tháng của file</b>, bấm <b>📂 Chọn file giờ</b>, kiểm lại rồi bấm <b>💾 Lưu</b>.',
    rong: 'Tháng đang chọn chưa lưu giờ. Chọn tháng khác ở cột trái, hoặc bấm 📂 Chọn file giờ.',
    bao: ['gioBao', 'gioXem'], rieng: 'gio',
    truocVe: function () { if (!DA_HOI.gio) { DA_HOI.gio = 1; moGio(); } },
    cot: function () {
      var x = MAU.xam, l = '#2E75B5';
      if (gioFile()) return [C('o_trang', 'Trang của file', 120, { mau: x }), C('o_dong', 'Dòng', 50, { mau: x, giua: 1 }), C('ho_ten', 'Họ và tên', 180, { mau: x, dam: 1 }), C('cccd', 'CCCD', 108, { mau: x, giua: 1, lop: function (r) { return r.cccd ? '' : 'o-thieu'; } }),
        C('nm', 'Tên nhà máy làm việc', 130, { mau: l }), C('tuyen', 'Người tuyển dụng', 110, { mau: x }), C('gio', 'Tổng giờ', 74, { mau: l, kieu: 'gio', tong: 1, dam: 1 }), C('dat', 'ĐẠT / K.ĐẠT', 104, { mau: MAU.vang2 }), C('ly_do', 'Ghi chú', 220, { mau: x })];
      return [C('ky_ten', 'Tháng', 66, { mau: x, giua: 1 }), C('nm', 'Tên nhà máy làm việc', 170, { mau: l, dam: 1 }), C('so_nguoi', 'Số người', 66, { mau: l, kieu: 'dem', tong: 1 }), C('so_dat', 'Đạt', 60, { mau: MAU.vang2, kieu: 'dem', tong: 1 }),
        C('gio', 'Tổng giờ', 84, { mau: l, kieu: 'gio', tong: 1, dam: 1 }), C('luu', 'Lưu lúc · bởi', 220, { mau: x }), C('ten_file', 'Tên file', 240, { mau: x })];
    },
    dong: function () {
      if (gioFile()) return gio.kq.dong.map(function (d) {
        return { o_trang: d.trang, o_dong: d.dong, ho_ten: d.ho_ten, cccd: d.cccd, nm: d.ma_tinh_luong, tuyen: d.nguoi_tuyen, gio: d.gio, dat: d.tinh_trang === 'dat' ? '✅ Đạt' : d.tinh_trang === 'khong_dat' ? '⏸ Không đạt' : '❔ Chưa rõ', ly_do: d.ly_do || '' };
      });
      var ra = [], chon = cacThang();
      ((gio.tom || {}).thang || []).forEach(function (t) {
        if (chon.indexOf(t.thang) < 0) return;
        (t.nha_may || []).forEach(function (n) { ra.push({ ky: t.thang, ky_ten: tenKy(t.thang), nm: n.ma, so_nguoi: n.so_dong, so_dat: n.so_dat, gio: n.gio, luu: t.luu_luc + ' · ' + t.luu_boi, ten_file: t.ten_file || '' }); });
      });
      return ra;
    },
    tom: function (ds) {
      var g = 0;
      ds.forEach(function (r) { g += Number(r.gio) || 0; });
      if (gioFile()) { var t = gio.kq.tong; return { chu: '⚠ <b>Chưa lưu</b>, đang xem file vừa chọn cho tháng ' + tenKy(gio.thang) + ' · <span class="so">' + t.so_dong + '</span> người · <span class="so">' + L.soVN(t.tong_gio) + '</span> giờ · <span class="so">' + t.so_dat + '</span> Đạt · <span class="so">' + t.so_khong_dat + '</span> Không đạt', chip: [] }; }
      return { chu: tenMoc() + ' · <span class="so">' + ds.length + '</span> dòng · <span class="so">' + L.soVN(g) + '</span> giờ', chip: [] };
    }
  };
  // ---- 💬 Phản hồi (vé 10): luật ở noibo.html, ngăn phải dùng lại theViecPH ----
  function phCan() { return ph.ds ? tatCaViec().filter(function (v) { return v.tt !== 'xong'; }).length : (trangThai.luoi && trangThai.luoi.ph_can_lam) || 0; }
  function moPhieu(r) {
    S.phMo = r.ma;
    var v = timViecPH(r.ma);
    if (v) moNgan('💬 ' + e(v.ho_ten), theViecPH(v));
  }
  TRANG.ph = {
    ten: '💬 Phản hồi', mau: '#7F7F7F', ben: ['o', 'tt'], bang: 2, ten_tep: 'Phan hoi', quyen: ['quan_ly', 'truong_nhom', 'ke_toan', 'quan_tri'],
    chi: '👉 Mỗi phiếu một dòng, phiếu chưa xong xếp trước. Bấm <b>mã phiếu</b> để đọc trao đổi, nhận việc, trả lời. Công nhân thấy câu trả lời dưới phiếu của họ khi tra lại, chỉ thấy vai chứ không thấy tên anh/chị.',
    rong: 'Chưa có phiếu phản hồi nào.',
    bao: ['phBao', 'phCanh'],
    truocVe: function () { if (!DA_HOI.ph) { DA_HOI.ph = 1; moPH(); } },
    cot: function () {
      var x = MAU.xam, d = MAU.duong;
      return [C('ma', 'Mã phiếu', 112, { mau: d, lien: 1 }), C('ho_ten', 'Họ và tên', 170, { mau: d, dam: 1 }), C('tinh_trang', 'Tình trạng', 210, { mau: MAU.vang2 }),
        C('qua', 'Quá hạn', 190, { mau: MAU.hong, lop: function (r) { return r.qua ? 'ma-do' : ''; } }), C('ma_ct', 'Công ty', 90, { mau: x, giua: 1 }), C('ky_ten', 'Tháng', 66, { mau: x, giua: 1 }), C('hm', 'Hạng mục', 170, { mau: x }),
        C('cccd4', 'CCCD (4 số cuối)', 74, { mau: x, giua: 1 }), C('nhan_boi', 'Người nhận', 130, { mau: x }), C('gui', 'Gửi lúc', 112, { mau: x, giua: 1 }), C('dau', 'Câu đầu tiên', 340, { mau: x })];
    },
    dong: function () {
      if (!ph.ds) return [];
      var ra = [], chon = Object.keys(S.ct);
      ph.ds.cong_ty.forEach(function (c) {
        if (chon.length && !S.ct[c.ma_ct]) return;
        c.viec.forEach(function (v) {
          var hm = VePhieu.HANG_MUC[v.hm], tin = (v.tin || []).filter(function (t) { return t.ai !== 'he'; })[0];
          ra.push({ ma: v.ma, ho_ten: v.ho_ten, ten_ct: c.ten, ma_ct: c.ma_ct, ky_ten: tenKy(v.ky), hm: hm ? hm.ten : v.hm, cccd4: '••••' + v.cccd4, nhan_boi: v.nhan_boi, gui: lucNgan(v.gui_luc), dau: tin ? tin.nd : '', tinh_trang: chuTuHtml(ttViecPH(v)),
                    qua: v.qua_han ? '⏰ Đã quá hạn gửi (' + ngayNgan(v.han) + ')' : v.qua_24h ? '⏰ Quá 24 giờ chưa ai nhận' : '', _xong: v.tt === 'xong', _gui: v.gui_luc || '', _pid: v.ma });
        });
      });
      return ra.sort(function (a, b) { return (a._xong ? 1 : 0) - (b._xong ? 1 : 0) || (a.qua ? 0 : 1) - (b.qua ? 0 : 1) || (a._gui < b._gui ? -1 : a._gui > b._gui ? 1 : 0); });
    },
    chk: [{ k: 'can', ten: 'Cần làm', khop: function (r) { return !r._xong; } }, { k: 'qua', ten: 'Quá hạn', khop: function (r) { return !!r.qua; } }, { k: 'xong', ten: 'Đã xong', khop: function (r) { return r._xong; } }],
    tom: function (ds) {
      return { chu: '<span class="so">' + ds.length + '</span> phiếu', chip: [['can', ds.filter(function (r) { return !r._xong; }).length + ' cần làm'], ['qua', ds.filter(function (r) { return r.qua; }).length + ' quá hạn']] };
    },
    mo: moPhieu
  };
  // ---- ⚙ Thiết lập (vé 11, 12): gõ trực tiếp trên lưới, 💾 mới gửi máy chủ ----
  function rowsSua(t) { var k = KHO_SUA[t]; return (k && k.rows) || []; }
  function daSua(r) { return r._sua && Object.keys(r._sua).length > 0; }
  function coLoiO(r) { return r._loi && Object.keys(r._loi).length > 0; }
  function laySua(t) {
    if (KHO_SUA[t]) return;
    KHO_SUA[t] = { dang: true };
    goi(Object.assign({ phien: trangThai.phien }, TRANG[t].cuDoc), 60).then(function (kq) {
      KHO_SUA[t] = kq.ok ? { rows: TRANG[t].tuKq(kq), kq: kq } : { loi: kq.loi };
      if (S.trang === t) veTrang(true);
    });
  }
  function ketLuu(html, loai, capNhatLuoi) {
    bao('luoiBao', loai, html);
    baoNhanh(loai === 'xanh' ? '✅ Đã lưu.' : '⛔ Có phần chưa lưu: xem dòng báo trên lưới.');
    veCu(); luoi.veLaiDong();
    if (capNhatLuoi) { dangChuyen = true; taiLuoiGiuBao($('luoiBao').innerHTML); }   // câu nhắc ở Việc tháng hết ngay sau khi lưu
  }
  /** Công ty, Tài khoản: một cú cho mọi dòng đã sửa. Máy chủ sai một ô thì không ghi gì, trả về từng ô. */
  function guiSua(goiTin, ds, timDong, cauXong, capNhatLuoi) {
    baoNhanh('⏳ Đang lưu ' + ds.length + ' dòng… đừng đóng trang.');
    goi(Object.assign({ phien: trangThai.phien }, goiTin), 60).then(function (kq) {
      if (kq.ok) { ds.forEach(function (r) { r._sua = {}; r._loi = {}; }); ketLuu('✅ ' + cauXong + ': ' + kq.so_o + ' ô.', 'xanh', capNhatLuoi); return; }
      if (kq.ma === 'O_LOI') {
        kq.o_loi.forEach(function (l) { var r = timDong(l); if (r) { r._loi = r._loi || {}; r._loi[l.o] = l.loi; } });
        ketLuu('<b>Chưa lưu gì: còn ' + kq.o_loi.length + ' ô đỏ.</b><ul class="loi-ds">' + kq.o_loi.slice(0, 8).map(function (l) { return '<li>' + e(l.loi) + '</li>'; }).join('') + '</ul>', 'do');
        return;
      }
      ketLuu('<b>Chưa lưu.</b> ' + e(kq.loi), 'do');
    });
  }
  function chiOSua(r, x) { Object.keys(r._sua).forEach(function (k) { x[k] = r[k]; }); return x; }
  var TEN_CHON = { co_dinh: 'Cố định', dieu_kien: 'Có điều kiện', chuan: 'Ngày công chuẩn', A: 'A', B: 'B' };
  function chonTen(v) { return v == null || v === '' ? '' : (TEN_CHON[v] || String(v)); }
  function chonTho(chu) { var ra = chu; Object.keys(TEN_CHON).forEach(function (k) { if (TEN_CHON[k] === chu) ra = k; }); return ra; }
  /** Một công ty từ kt_quy_tac_ds → một dòng phẳng. Mỗi quy tắc một ô, ô chọn giữ chữ dễ đọc. `nhom`, `dsMa`, `maCa` = QT_NHOM, QT_DS_MA, DocBangCong.MA_CA. */
  function dongQT(c, nhom, dsMa, maCa) {
    var r = { ma_ct: c.ma_ct, ten: c.ten, dia: c.dia_ban, ap_dung_tu: c.ap_dung_tu || '', luu: c.luu_luc ? c.luu_luc + ' · ' + c.luu_boi : '', _sua: {}, _loi: {} }, b = c.bo || {};
    nhom.forEach(function (n) { n.o.forEach(function (o) { r[o.k] = o.chon ? chonTen(b[o.k]) : (b[o.k] == null ? '' : b[o.k]); }); });
    (maCa.A || []).concat(maCa.B || []).forEach(function (m) { var v = (b.he_so || {})[m]; r['he_so.' + m] = v == null ? '' : v; });
    dsMa.forEach(function (x) { r[x[0]] = (b[x[0]] || []).join(', '); });
    (c.o_loi || []).forEach(function (l) { r._loi[l.o] = l.loi; });
    return r;
  }
  /** Dòng → bộ gửi cho kt_quy_tac_luu. Ô của dạng khác không gửi; chữ người gõ để nguyên, máy chủ soát để câu báo chỉ có một nguồn. */
  function boTuDong(r, nhom, dsMa, maCa) {
    var bo = { he_so: {} };
    nhom.forEach(function (n) { n.o.forEach(function (o) { bo[o.k] = o.chon ? chonTho(r[o.k]) : r[o.k]; }); });
    (maCa[r.dang] || []).forEach(function (m) { bo.he_so[m] = r['he_so.' + m]; });
    dsMa.forEach(function (x) { bo[x[0]] = String(r[x[0]] || '').toUpperCase().split(/[,;\s]+/).filter(Boolean); });
    return bo;
  }
  var TIEN_QT = /^(luong_cb|pc_trach_nhiem|cc_muc|xang_xe_muc|nha_o_muc|tn_muc|an_ca|phat)/, MAU_NHOM_QT = [MAU.cam, MAU.nhat, MAU.vang2, MAU.la, MAU.hong, MAU.duong, MAU.cam2];
  function cotQT() {
    var cot = [C('ma_ct', 'Mã', 84, { mau: MAU.duong, giua: 1, dam: 1 }), C('ten', 'Công ty', 200, { mau: MAU.duong }),
      C('ap_dung_tu', ['Bộ đang dùng', 'Từ tháng'], 74, { mau: MAU.xam, giua: 1, lay: function (r) { return r.ap_dung_tu ? tenKy(r.ap_dung_tu) : ''; }, ct: 'Lưu là thêm một bộ mới từ tháng anh/chị chọn. Tháng trước đó vẫn tính theo số cũ.' }), C('luu', ['Bộ đang dùng', 'Lưu lúc · bởi'], 170, { mau: MAU.xam })];
    QT_NHOM.forEach(function (n, i) {
      var mau = MAU_NHOM_QT[i % MAU_NHOM_QT.length];
      n.o.forEach(function (o) {
        var c = C(o.k, [n.ten, o.nhan], o.chon ? 110 : 96, { mau: mau, ct: o.chi + ' ' + o.vd, batBuoc: 1, xamKhiChan: 1 });
        if (o.chon) { c.sua = { kieu: 'chon', ds: o.chon.map(function (x) { return chonTen(x[0]); }) }; c.giua = 1; }
        else { c.kieu = TIEN_QT.test(o.k) ? 'tien' : 'gio'; c.sua = { kieu: 'so' }; }
        if (o.chiDK) c.chanSua = function (r) { return r.cc_kieu === 'Có điều kiện' ? '' : 'Ô này chỉ dùng khi Kiểu chuyên cần là Có điều kiện.'; };
        cot.push(c);
      });
      if (!n.rieng) return;
      var A = DocBangCong.MA_CA.A, B = DocBangCong.MA_CA.B;
      THU_TU_CA.filter(function (m) { return A.indexOf(m) >= 0 || B.indexOf(m) >= 0; }).forEach(function (m) {
        cot.push(C('he_so.' + m, [n.ten, 'Hệ số từng mã ca', m], 62, { mau: mau, kieu: 'gio', sua: { kieu: 'so' }, batBuoc: 1, xamKhiChan: 1, ct: 'Hệ số ' + m + ' (' + (TEN_MA_CA[m] || m) + '). Tiền giờ = đơn giá × hệ số × giờ. Ví dụ 1,5.',
          chanSua: function (r) { var ds = DocBangCong.MA_CA[r.dang]; return !ds ? 'Chọn Dạng bảng công ở ô trước.' : ds.indexOf(m) < 0 ? 'Dạng ' + r.dang + ' không có mã ca ' + m + '.' : ''; } }));
      });
      QT_DS_MA.forEach(function (x) { cot.push(C(x[0], [n.ten, x[1]], 150, { mau: mau, sua: { kieu: 'chu' }, batBuoc: 1, ct: x[2] + ' ' + x[3] + ' Gõ mã cách nhau dấu phẩy, ví dụ HCN, HCD.' })); });
    });
    return cot;
  }
  /** Lưu lần lượt từng công ty đã sửa. Một công ty lỗi không chặn công ty khác; báo rõ công ty nào đã lưu. */
  function guiQT(ds, tu) {
    var xong = [], hong = [], i = 0;
    (function tiep() {
      if (i >= ds.length) {
        var html = (xong.length ? '✅ Đã lưu ' + xong.length + ' công ty: ' + e(xong.join(', ')) + ', áp dụng từ tháng ' + tenKy(tu) + '. Tháng trước đó vẫn tính theo số cũ. ' : '') +
          (hong.length ? '<b>⛔ Chưa lưu ' + hong.length + ' công ty.</b> Sửa ô đỏ rồi bấm 💾 lại.<ul class="loi-ds">' + hong.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>' : '');
        ketLuu(html, hong.length ? (xong.length ? 'cho' : 'do') : 'xanh', xong.length > 0);
        return;
      }
      var r = ds[i++];
      baoNhanh('⏳ Đang lưu ' + i + '/' + ds.length + ': ' + r.ten + '… đừng đóng trang.');
      goi({ hanh_dong: 'kt_quy_tac_luu', phien: trangThai.phien, ma_ct: r.ma_ct, ap_dung_tu: tu, bo: boTuDong(r, QT_NHOM, QT_DS_MA, DocBangCong.MA_CA) }, 60).then(function (kq) {
        if (kq.ok) { r._sua = {}; r._loi = {}; r.ap_dung_tu = kq.ap_dung_tu || tu; r.luu = 'Vừa lưu · ' + trangThai.tk.ho_ten; xong.push(r.ten); }
        else if (kq.ma === 'QUY_TAC_LOI') { kq.o_loi.forEach(function (l) { r._loi[l.o] = l.loi; }); hong.push(r.ten + ': ' + kq.o_loi.slice(0, 3).map(function (l) { return l.loi; }).join(' · ')); }
        else hong.push(r.ten + ': ' + kq.loi);
        tiep();
      });
    })();
  }
  TRANG.qt = {
    ten: '📐 Quy tắc lương', mau: '#548235', ben: ['o', 'tt'], bang: 2, sua: true, ten_tep: 'Quy tac luong', quyen: ['ke_toan', 'quan_tri'],
    chi: '👉 Mỗi công ty một dòng, mỗi quy tắc một ô. Gõ thẳng vào ô hoặc dán cả vùng từ Excel. Bấm một ô thì thanh trên giải thích ô đó. Ô cam là còn thiếu, ô vàng là vừa sửa, ô xám không áp dụng. Xong bấm <b>💾 Lưu</b>.',
    rong: 'Tài khoản chưa được giao công ty nào để khai quy tắc.',
    cuDoc: { hanh_dong: 'kt_quy_tac_ds' },
    tuKq: function (kq) { return kq.cong_ty.map(function (c) { return dongQT(c, QT_NHOM, QT_DS_MA, DocBangCong.MA_CA); }); },
    truocVe: function () { laySua('qt'); },
    cot: cotQT,
    dong: function () { var chon = Object.keys(S.ct); return rowsSua('qt').filter(function (r) { return !chon.length || S.ct[r.ma_ct]; }); },
    chk: [{ k: 'chua', ten: 'Chưa có quy tắc', khop: function (r) { return !r.ap_dung_tu; } }, { k: 'sua', ten: 'Đang sửa dở', khop: daSua }],
    tom: function (ds) {
      return { chu: '<span class="so">' + ds.length + '</span> công ty', chip: [['chua', ds.filter(function (r) { return !r.ap_dung_tu; }).length + ' chưa có quy tắc']] };
    },
    luu: function (ds) {
      var tu = '';
      hoi('<p><b>Lưu quy tắc ' + ds.length + ' công ty: ' + e(ds.slice(0, 5).map(function (r) { return r.ten; }).join(', ')) + (ds.length > 5 ? '…' : '') + '</b></p><p>Lưu là thêm một bộ mới, không xoá bộ cũ. Tháng trước tháng áp dụng vẫn tính theo số cũ. Sửa số sai của đúng tháng nào thì chọn chính tháng đó.</p>' +
          '<label for="klQtTu">Áp dụng từ tháng</label><input id="klQtTu" type="month" value="' + thangNay() + '"><div class="loi-o an" id="klQtTuLoi"></div>',
          '💾 Lưu quy tắc', 'Thôi', function () { guiQT(ds, tu); }, null, function () {
            tu = $('klQtTu').value;
            if (!tu) { $('klQtTuLoi').textContent = 'Chưa chọn tháng áp dụng.'; $('klQtTuLoi').classList.remove('an'); return false; }
            return true;
          });
    }
  };
  TRANG.ct = {
    ten: '🏭 Công ty', mau: '#548235', ben: ['tt'], bang: 2, sua: true, ten_tep: 'Cong ty', quyen: ['ke_toan', 'quan_tri'],
    chi: '👉 Ô cam ghi "cần điền" là ô còn thiếu. Gõ thẳng vào ô rồi bấm <b>💾 Lưu</b>, câu nhắc ở Việc tháng sẽ hết. Ô xám chỉ Quản trị sửa được. Thêm công ty mới vẫn làm ở Google Sheet.',
    rong: 'Tài khoản chưa được giao công ty nào.',
    cuDoc: { hanh_dong: 'kt_cong_ty_doc' },
    tuKq: function (kq) { return kq.dong.map(function (d) { d._sua = {}; d._loi = {}; return d; }); },
    truocVe: function () { laySua('ct'); },
    cot: function () {
      var k = KHO_SUA.ct && KHO_SUA.ct.kq, het = k && k.sua_het, chan = function () { return het ? '' : 'Ô này chỉ Quản trị sửa được.'; }, x = MAU.duong, la = MAU.la;
      return [C('ma_ct', 'Mã công ty', 90, { mau: x, giua: 1, dam: 1, ct: 'Mã là khoá của mọi dữ liệu, không sửa được.' }),
        C('ten', 'Tên công ty', 240, { mau: x, sua: { kieu: 'chu' }, chanSua: chan, xamKhiChan: 1 }), C('dia_ban', 'Địa bàn', 110, { mau: x, sua: { kieu: 'chu' }, chanSua: chan, xamKhiChan: 1 }), C('dang_dung', 'Đang dùng', 80, { mau: x, giua: 1, sua: { kieu: 'chon', ds: ['Có', 'Tắt'] }, chanSua: chan, xamKhiChan: 1, ct: 'Tắt thì công ty không còn ở lưới và trang công nhân.' }),
        C('nguong_cong_moi', 'Ngưỡng công người mới', 96, { mau: la, kieu: 'gio', sua: { kieu: 'so' }, batBuoc: 1, ct: 'Người vào làm trong kỳ có tổng công dưới số này thì giữ lương (KTT). Chưa có số thì chưa tính được lương.' }),
        C('ma_file_gio', 'Mã trong file giờ (cột Tên nhà máy)', 130, { mau: la, sua: { kieu: 'chu' }, batBuoc: 1, ct: 'Đúng chữ ở cột U của file Tháng N, để lọc giờ đúng nhà máy.' }),
        C('khu_vuc', 'Khu vực', 86, { mau: la, giua: 1, sua: { kieu: 'chon', ds: KHU_VUC }, batBuoc: 1, ct: 'Cột Thuộc KV của file Tháng N.' }),
        C('ten_chay_luong', 'Tên chạy lương (khi khác tên trong file)', 170, { mau: la, sua: { kieu: 'chu' }, ct: 'Chỉ điền khi file lương ghi tên khác tên công ty ở trên. Ví dụ MAGTRON.' })];
    },
    dong: function () { return rowsSua('ct'); },
    chk: [{ k: 'thieu', ten: 'Còn ô thiếu', khop: function (r) { return r.nguong_cong_moi === '' || !r.ma_file_gio || !r.khu_vuc; } }],
    tom: function (ds) { return { chu: '<span class="so">' + ds.length + '</span> công ty', chip: [['thieu', ds.filter(this.chk[0].khop).length + ' công ty còn ô thiếu']] }; },
    luu: function (ds) { guiSua({ hanh_dong: 'kt_cong_ty_luu', dong: ds.map(function (r) { return chiOSua(r, { ma_ct: r.ma_ct }); }) }, ds, function (l) { return ds.filter(function (r) { return r.ma_ct === l.ma_ct; })[0]; }, 'Đã lưu ' + ds.length + ' công ty', true); }
  };
  var KHU_VUC = ['QKV1', 'QKV2', 'QKV3', 'QKV4'];
  TRANG.tk = {
    ten: '👤 Tài khoản', mau: '#548235', ben: [], bang: 2, sua: true, ten_tep: 'Tai khoan', quyen: ['quan_tri'],
    chi: '👉 Mỗi dòng ở tab tài khoản của Sheet là một dòng ở đây. Sửa chức vụ, công ty phụ trách, khoá rồi bấm <b>💾 Lưu</b>: có hiệu lực ở lượt bấm sau của người đó, không cần đăng nhập lại. Thêm người, đặt mật khẩu vẫn làm ở Google Sheet.',
    rong: 'Chưa có tài khoản nào.',
    cuDoc: { hanh_dong: 'kt_tai_khoan_doc' },
    tuKq: function (kq) { return kq.dong.map(function (d) { d._sua = {}; d._loi = {}; d.mk = d.co_mk ? '✅ Đã đặt' : '⚠ Chưa đặt'; return d; }); },
    truocVe: function () { laySua('tk'); },
    cot: function () {
      var x = MAU.duong, la = MAU.la;
      return [C('dong', 'Dòng ở Sheet', 56, { mau: MAU.xam, giua: 1 }), C('cccd', 'CCCD', 110, { mau: MAU.xam, giua: 1, ct: 'Số CCCD là khoá đăng nhập, không sửa được ở đây.' }), C('ho_ten', 'Họ và tên', 180, { mau: x, sua: { kieu: 'chu' } }),
        C('vai_tro', 'Chức vụ', 200, { mau: la, sua: { kieu: 'chu' }, ct: 'Kế toán, Hành chính, Xem lương, Quản lý, Trưởng nhóm hoặc Quản trị; nhiều chức vụ thì cách nhau dấu phẩy.' }),
        C('cong_ty', 'Công ty phụ trách', 240, { mau: la, sua: { kieu: 'chu' }, ct: 'Mã công ty cách nhau dấu phẩy. Dấu * là mọi công ty.' }), C('khoa', 'Khoá', 70, { mau: la, giua: 1, sua: { kieu: 'chon', ds: ['Mở', 'Khoá'] }, ct: 'Khoá thì người này không vào được nữa, kể cả đang đăng nhập.' }),
        C('mk', 'Mật khẩu', 90, { mau: MAU.xam, giua: 1, ct: 'Chỉ báo đã đặt hay chưa. Đặt mật khẩu ở Google Sheet.' }), C('lan_vao_cuoi', 'Lần vào cuối', 130, { mau: MAU.xam, giua: 1 })];
    },
    dong: function () { return rowsSua('tk'); },
    luu: function (ds) { guiSua({ hanh_dong: 'kt_tai_khoan_luu', dong: ds.map(function (r) { return chiOSua(r, { dong: r.dong, cccd: r.cccd }); }) }, ds, function (l) { return ds.filter(function (r) { return r.dong === l.dong; })[0]; }, 'Đã lưu ' + ds.length + ' tài khoản', false); }
  };
  var THU_TU = ['viec', 'cong', 'tru', 'luong', 'so', 'thangn', 'gio', 'ph', '|', 'qt', 'ct', 'tk'];

  function trang() { return TRANG[S.trang]; }
  function benNay(p) { return (typeof p.ben === 'function' ? p.ben() : p.ben) || []; }
  function gopNay(p) { return (p.gop && S.gop[S.trang]) || ''; }
  function chuaLuu() { var p = trang(); return p && p.sua ? rowsSua(S.trang).filter(daSua).length : 0; }
  /** Rời trang thiết lập khi còn ô chưa lưu thì hỏi lại. Nút chính là ở lại, vì mất công gõ thì khó lấy lại. */
  function hoiRoi(lam) {
    var n = chuaLuu();
    if (!n) { lam(); return; }
    hoi('<p><b>Còn ' + n + ' dòng đã sửa mà chưa lưu.</b></p><p>Rời trang thì các ô vừa sửa bị bỏ, số trên máy chủ không đổi.</p>', '↩ Ở lại để lưu', 'Rời trang, bỏ các ô đã sửa', function () {}, function () { delete KHO_SUA[S.trang]; lam(); });
  }
  function dkAi(p) {
    var t = L.boDau(S.tim.trim()), tuyen = Object.keys(S.tuyen), coAi = benNay(p).indexOf('ai') >= 0;
    var chk = (p.chk || []).filter(function (x) { return S.chk[S.trang + x.k]; });
    return function (r) {
      if (coAi && t && L.boDau(r.ho_ten + ' ' + (r.ten_thuc || '') + ' ' + (r.cccd_nm || '') + ' ' + (r.cccd_thuc || '') + ' ' + (r.code || '')).indexOf(t) < 0) return false;
      if (coAi && tuyen.length && !S.tuyen[r.tuyen]) return false;
      return chk.every(function (x) { return x.khop(r); });
    };
  }
  var GOM = {
    ky: { khoa: function (r) { return r.ky; }, ten: function (r) { return 'Tháng ' + r.ky_ten; } }, ma_ct: { khoa: function (r) { return r.ma_ct; }, ten: function (r) { return r.ten_ct; } },
    dia: { khoa: function (r) { return r.dia || '(trống)'; }, ten: function (r) { return r.dia || '(trống)'; } }, tuyen: { khoa: function (r) { return r.tuyen || '(trống)'; }, ten: function (r) { return r.tuyen || '(trống)'; } },
    nguoi: { khoa: function (r) { return r._pid; }, ten: function (r) { return r.ho_ten + ' · ' + r.ma_ct; } }
  };
  /** Dựng cột + dòng đang xem của trang. `nen` = dòng theo từng người trước gộp (cho Tóm lại). */
  function dungBang(p) {
    var gop = gopNay(p), goc = (gop && p.dongGop ? p.dongGop() : p.dong()).filter(dkAi(p));
    var coPH = coCV('quan_ly', 'truong_nhom', 'ke_toan', 'quan_tri');
    var cot = (gop && p.cotGop ? p.cotGop(goc) : p.cot(goc)).filter(function (c) { return (coTien() || !c.tien) && (coPH || !c.chiPH); }), dong = goc;
    var bang = (p.bang || 0) + (cot[0] && cot[0].k === 'ky_ten' && p.bang ? 1 : 0);   // nhiều tháng có thêm cột Tháng ở đầu, cũng đóng băng
    if (gop) {
      var tenG = p.gop.filter(function (x) { return x[0] === gop; })[0][1], cotG = cot;
      dong = L.gomDong(goc, { khoa: GOM[gop].khoa, ten: GOM[gop].ten, nguoi: function (r) { return r._pid; }, cot: cotG });
      dong.forEach(function (r) { r._gop = gop; });
      cot = [C('nhom', tenG, 210, { mau: MAU.xam, lien: 1, dam: 1 }), C('so_nguoi', 'Số người', 64, { mau: MAU.xam, kieu: 'dem', tong: 1, ct: 'Đếm mỗi người một lần. Nhiều tháng thì mỗi người mỗi tháng một lần.' })].concat(cotG.filter(function (c) { return c.tong; }));
      bang = 1;
    }
    var an = S.an[S.trang] = S.an[S.trang] || Object.assign({}, p.anSan || {});
    cot = cot.filter(function (c) { return !c.n || !an[c.n]; });
    if (p.bangDen) cot.forEach(function (c, j) { if (c.k === p.bangDen) bang = j + 1; });
    return { cot: cot, dong: dong, bang: bang, nen: goc, gop: gop };
  }

  // ================== VẼ ==================
  function dung() {
    if (daDung) return;
    daDung = true;
    $('mKL').innerHTML = '<div class="kl-than" id="klThan"><aside class="kl-ben" id="klBen" aria-label="Bộ lọc"></aside><div class="kl-chinh"><div class="chi" id="klChi"></div><div id="klBaoChung"></div><div id="klTien"></div>' +
      '<div class="kl-tom" id="klTom"></div><div class="kl-cu" id="klCuRieng"></div><div class="kl-cu" id="klCu"></div><div class="kl-luoi" id="klLuoi"></div></div></div><div class="xl-hop" id="klHop" hidden></div>';
    // Ngăn phải + câu báo nhanh dùng cho cả màn lưới lẫn màn tải file nên đặt ở cấp khung, không nằm trong màn nào
    var khung = document.querySelector('.khung'), ngan = document.createElement('aside'), nhanh = document.createElement('div');
    ngan.id = 'klNgan'; ngan.className = 'kl-ngan'; ngan.hidden = true; khung.appendChild(ngan);
    nhanh.id = 'klBao'; nhanh.className = 'kl-bao'; nhanh.setAttribute('role', 'status'); nhanh.hidden = true; khung.appendChild(nhanh);
    ngan.addEventListener('click', bamTrang);
    // Câu báo của các nút cũ phải hiện trên lưới, không nằm trong màn thẻ đang ẩn. Kiểu đã chọn chỉ đổi khi tải lại trang nên chuyển chỗ một lần là đủ
    ['luoiBao', 'thnChua', 'thnCanh', 'thnBao', 'gioBao', 'gioXem', 'phBao', 'phCanh'].forEach(function (id) { $('klBaoChung').appendChild($(id)); });
    var r1 = document.createElement('span'), r2 = document.createElement('span');
    r1.className = r2.className = 'kl-rieng'; r1.setAttribute('data-trang', 'thangn'); r2.setAttribute('data-trang', 'gio');
    r1.appendChild($('nutLuuThangN'));
    var nhanThang = document.createElement('label');
    nhanThang.setAttribute('for', 'gioThang'); nhanThang.textContent = 'Tháng của file';
    [nhanThang, $('gioThang'), $('nutChonGio'), $('chonFileGio'), $('nutLuuGio')].forEach(function (x) { r2.appendChild(x); });
    var boGio = document.createElement('button');
    boGio.type = 'button'; boGio.id = 'klBoGio'; boGio.className = 'phu'; boGio.textContent = '↩ Bỏ file này'; boGio.setAttribute('data-kl', 'bo_gio');
    r2.appendChild(boGio);
    $('klCuRieng').appendChild(r1); $('klCuRieng').appendChild(r2);
    luoi = L.tao($('klLuoi'), { bao: baoNhanh, mo: moDong, sauLoc: veTom, sauSua: sauSua, suaRieng: suaRieng, zoom: Number(doc(KHOA_ZOOM)) || 100, khiZoom: function (z) { nho(KHOA_ZOOM, z); } });
    $('mKL').addEventListener('click', bamTrang);
    $('mKL').addEventListener('input', goTrang);
    window.addEventListener('beforeunload', function (ev) { if (chuaLuu()) { ev.preventDefault(); ev.returnValue = ''; } });
    // Màn tải file: lưới thứ hai, chỉ hiện khi đang xem trước
    var tai = document.createElement('div');
    tai.id = 'klTai'; tai.className = 'kl-tai an';
    tai.innerHTML = '<div class="kl-tai-loi" id="klTaiLoi" hidden></div><div class="kl-tai-phai"><div class="kl-tai-bao" id="klTaiBao"></div><div class="kl-tai-tabs" id="klTaiTabs"></div><div class="kl-luoi" id="klTaiLuoi"></div></div>';
    $('mTai').appendChild(tai);
    tai.addEventListener('click', bamTai);
    luoiTai = L.tao($('klTaiLuoi'), { bao: baoNhanh, mo: moDongTai, zoom: Number(doc(KHOA_ZOOM)) || 100, khiZoom: function (z) { nho(KHOA_ZOOM, z); } });
    document.addEventListener('click', function (ev) { var h = $('klHop'); if (h && !h.hidden && !ev.target.closest('#klHop') && !ev.target.closest('[data-kl="chon_cot"]')) h.hidden = true; });
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape' || document.querySelector('.lop-phu')) return;
      var h = $('klHop');
      if (h && !h.hidden) h.hidden = true; else if ($('klNgan') && !$('klNgan').hidden) dongNgan();
    });
    $('klTabs').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-tab]');
      if (b) moTrang(b.getAttribute('data-tab'));
    });
  }
  function veTabs() {
    var h = '';
    THU_TU.forEach(function (k) {
      if (k === '|') { if (coCV('ke_toan', 'quan_tri')) h += '<span class="kl-tab-ke"></span><span class="kl-tab-nhan">⚙ Thiết lập</span>'; return; }
      var p = TRANG[k];
      if (!coCV.apply(null, p.quyen)) return;
      var dem = k === 'ph' && phCan() ? '<span class="kl-dem-tab">' + phCan() + '</span>' : '';
      h += '<button type="button" class="kl-tab" style="--m:' + p.mau + '" data-tab="' + k + '" aria-pressed="' + (S.trang === k) + '">' + p.ten + dem + '</button>';
    });
    $('klTabs').innerHTML = h;
  }
  function vePhanBen(ma, ten, tom, than) {
    return '<div class="kl-phan"><button type="button" class="kl-dau-phan" data-kl="phan" data-v="' + ma + '"><span><b>' + ten + '</b><span class="tom">' + tom + '</span></span><span class="mui">' + (S.mo[ma] ? '▲ Thu' : '▼ Mở') + '</span></button>' + (S.mo[ma] ? '<div class="kl-than-phan">' + than + '</div>' : '') + '</div>';
  }
  function nutCay(cap, khoa, ten, tu, den, lui, coCon) {
    var ch = cacThang(), now = thangNay(), trong = ch.length && tu >= ch[0] && (den <= ch[ch.length - 1] || (den >= now && ch[ch.length - 1] === now && tu <= now)), cham = !trong && ch.length && tu <= ch[ch.length - 1] && den >= ch[0];
    return '<div class="kl-cay" style="padding-left:' + (lui * 16) + 'px"><button type="button" class="kl-mo-cay" data-kl="mo_cay" data-v="' + khoa + '"' + (coCon ? '' : ' disabled') + ' aria-label="' + (S.moCay[khoa] ? 'Thu' : 'Mở') + '">' + (S.moCay[khoa] ? '−' : '+') + '</button>' +
      '<button type="button" class="kl-ten-cay' + (trong ? ' sang' : cham ? ' mot-phan' : '') + '" data-kl="cay" data-v="' + cap + '|' + tu + '|' + den + '"' + (tu > now ? ' disabled' : '') + '>' + ten + (cap === 'thang' && tu === now ? '<small>· đang dở</small>' : '') + '</button></div>';
  }
  function veThoiGian() {
    var h = '', y = +thangNay().substring(0, 4);
    [y, y - 1].forEach(function (nam) {
      h += nutCay('nam', String(nam), 'Năm ' + nam, nam + '-01', nam + '-12', 0, true);
      if (!S.moCay[nam]) return;
      [1, 2, 3, 4].forEach(function (q) {
        var a = nam + '-' + ('0' + (q * 3 - 2)).slice(-2), b = nam + '-' + ('0' + (q * 3)).slice(-2), kq = nam + '-Q' + q;
        h += nutCay('quy', kq, 'Quý ' + q, a, b, 1, true);
        if (S.moCay[kq]) for (var m = q * 3 - 2; m <= q * 3; m++) { var k = nam + '-' + ('0' + m).slice(-2); h += nutCay('thang', k, 'Tháng ' + m, k, k, 2, false); }
      });
    });
    return h + '<p class="kl-ghi">👉 Chạm thêm một mục <b>cùng cấp</b> để chọn khoảng. Bấm + để mở mục con.</p>';
  }
  function dsCT(q) {
    var chon = Object.keys(S.ct), h = '<button type="button" class="kl-dong" data-kl="ct_het" aria-pressed="' + !chon.length + '"><span class="kl-tich"></span>Toàn bộ ' + congTy().length + ' công ty</button>', dia = {}, thu = [];
    congTy().forEach(function (c) { var d = c.dia_ban || '(Chưa ghi địa bàn)'; if (!dia[d]) { dia[d] = []; thu.push(d); } dia[d].push(c); });
    thu.sort(function (a, b) { return a.localeCompare(b, 'vi'); }).forEach(function (d) {
      var ds = dia[d].filter(function (c) { return !q || L.boDau(c.ten + ' ' + c.ma_ct + ' ' + d).indexOf(q) >= 0; });
      if (!ds.length) return;
      var co = ds.filter(function (c) { return S.ct[c.ma_ct]; }).length, mo = S.moDia[d] || q;
      h += '<div class="kl-hang-nhom"><button type="button" class="kl-dong kl-nhom-dau" data-kl="dia" data-v="' + e(d) + '" aria-pressed="' + (co === ds.length ? 'true' : co ? 'mixed' : 'false') + '"><span class="kl-tich"></span>' + e(d) + '<span class="so">' + ds.length + '</span></button>' +
        '<button type="button" class="kl-nut-mo" data-kl="mo_dia" data-v="' + e(d) + '" aria-label="Mở danh sách ' + e(d) + '">' + (mo ? '▲' : '▼') + '</button></div>';
      if (mo) ds.forEach(function (c) { h += '<button type="button" class="kl-dong kl-long" data-kl="ct" data-v="' + e(c.ma_ct) + '" aria-pressed="' + !!S.ct[c.ma_ct] + '"><span class="kl-tich"></span>' + e(c.ten) + '<span class="so">' + e(c.ma_ct) + '</span></button>'; });
    });
    return h;
  }
  function veAi(p) {
    var h = '';
    if (p.gop) h += '<p class="kl-ghi" style="margin-top:0">Gộp dòng theo (cộng số lại như báo cáo):</p><div class="kl-chon">' + p.gop.map(function (x) { return '<button type="button" data-kl="gop" data-v="' + x[0] + '" aria-pressed="' + (gopNay(p) === x[0]) + '">' + e(x[1]) + '</button>'; }).join('') + '</div>';
    h += '<input class="kl-tim" id="klTimNguoi" type="search" placeholder="🔎 Gõ tên, số căn cước, mã code" autocomplete="off" aria-label="Tìm người" value="' + e(S.tim) + '">';
    var dem = {};
    (gopNay(p) && p.dongGop ? p.dongGop() : p.dong()).forEach(function (r) { if (r.tuyen) { dem[r.tuyen] = dem[r.tuyen] || {}; dem[r.tuyen][r._pid] = 1; } });
    var ds = Object.keys(dem).sort(function (a, b) { return a.localeCompare(b, 'vi'); });
    if (ds.length) h += '<p class="kl-ghi">Người tuyển:</p>' + ds.map(function (t) { return '<button type="button" class="kl-dong" data-kl="tuyen" data-v="' + e(t) + '" aria-pressed="' + !!S.tuyen[t] + '"><span class="kl-tich"></span>' + e(t) + '<span class="so">' + Object.keys(dem[t]).length + '</span></button>'; }).join('');
    return h;
  }
  function veBen() {
    var p = trang(), ben = benNay(p), el = $('klBen'), an = !ben.length || S.gonBen;
    el.hidden = an; el.style.display = an ? 'none' : ''; $('klThan').classList.toggle('gon', an);
    if (an) return;
    var h = '<button type="button" class="kl-lai" data-kl="lai">↺ Chọn lại từ đầu</button>', so = 0, VONG = ['①', '②', '③', '④'];
    if (ben.indexOf('tg') >= 0) h += vePhanBen('tg', VONG[so++] + ' Thời gian', tenMoc(), veThoiGian());
    if (ben.indexOf('dia') >= 0) {
      var chonDia = Object.keys(S.diaN);
      h += vePhanBen('dia', VONG[so++] + ' Ở đâu', chonDia.length ? e(chonDia.join(', ')) : 'Mọi địa bàn', '<button type="button" class="kl-dong" data-kl="dia_n_het" aria-pressed="' + !chonDia.length + '"><span class="kl-tich"></span>Mọi địa bàn</button>' +
        ((thn.kq || {}).trang || []).map(function (tr) { var t = tenDiaN(tr); return '<button type="button" class="kl-dong" data-kl="dia_n" data-v="' + e(t) + '" aria-pressed="' + !!S.diaN[t] + '"><span class="kl-tich"></span>' + e(t) + '<span class="so">' + tr.dong.length + '</span></button>'; }).join(''));
    }
    if (ben.indexOf('o') >= 0) {
      var ten = cacCT().map(function (c) { return c.ten; }).join(', ');
      h += vePhanBen('o', VONG[so++] + ' Ở đâu', Object.keys(S.ct).length ? e(ten.length > 60 ? cacCT().length + ' công ty đã chọn' : ten) : 'Toàn bộ ' + congTy().length + ' công ty',
        '<input class="kl-tim" id="klTimCT" type="search" placeholder="🔎 Tìm công ty, địa bàn" autocomplete="off" aria-label="Tìm công ty" value="' + e(S.timCT) + '"><div id="klDsCT">' + dsCT(L.boDau(S.timCT)) + '</div>');
    }
    if (ben.indexOf('ai') >= 0) {
      var tomAi = (p.gop ? (p.gop.filter(function (x) { return x[0] === gopNay(p); })[0] || p.gop[0])[1] : '') + (Object.keys(S.tuyen).length ? ' · ' + Object.keys(S.tuyen).join(', ') : '') + (S.tim ? ' · "' + S.tim + '"' : '');
      h += vePhanBen('ai', VONG[so++] + ' Theo ai', e(tomAi) || 'Mọi người', veAi(p));
    }
    if (ben.indexOf('tt') >= 0 && p.chk) {
      var bat = p.chk.filter(function (x) { return S.chk[S.trang + x.k]; }).map(function (x) { return x.ten; });
      h += vePhanBen('tt', VONG[so++] + ' Tình trạng', bat.length ? e(bat.join(', ')) : 'Tất cả', p.chk.map(function (x) { return '<button type="button" class="kl-dong" data-kl="chk" data-v="' + x.k + '" aria-pressed="' + !!S.chk[S.trang + x.k] + '"><span class="kl-tich"></span>' + e(x.ten) + '</button>'; }).join(''));
    }
    el.innerHTML = h;
  }
  function veTien() {
    var h = '', chonKh = {}, canh = [], laSo = S.trang === 'so', sua = KHO_SUA[S.trang];
    cacThang().forEach(function (ky) { cacCT().forEach(function (c) { chonKh[(laSo ? 'so|' : '') + c.ma_ct + '|' + ky] = 1; }); });
    if (sua && sua.dang) h += '<div class="kl-tien">⏳ Đang lấy số… cứ chờ, đừng tải lại trang.</div>';
    if (sua && sua.loi) h += '<div class="kl-tien hong">⚠ Chưa lấy được số: ' + e(sua.loi) + '<button type="button" data-kl="thu_lai">🔄 Thử lại</button></div>';
    if (dangLay) h += '<div class="kl-tien">⏳ Đang lấy số ' + dangLay.xong + '/' + dangLay.tong + ' công ty… cứ chờ, đừng tải lại trang. Bảng dưới đang hiện phần đã lấy được.</div>';
    var loi = Object.keys(LOI).filter(function (k) { return chonKh[k]; }).map(function (k) { return LOI[k].ten + ' (' + LOI[k].cau + ')'; });
    if (loi.length) h += '<div class="kl-tien hong">⚠ Chưa lấy được ' + loi.length + ' công ty: ' + e(loi.slice(0, 5).join('; ')) + (loi.length > 5 ? '…' : '') + '. Số trong bảng chưa đủ.<button type="button" data-kl="thu_lai">🔄 Thử lại</button></div>';
    if (LOI_SO) h += '<div class="kl-tien hong">⚠ Chưa đọc được sổ lưu trữ: ' + e(LOI_SO) + '<button type="button" data-kl="thu_lai">🔄 Thử lại</button></div>';
    var nguonKho = laSo ? KHO_SS : KHO;
    Object.keys(nguonKho).forEach(function (k) { if (chonKh[k] && nguonKho[k].canh) canh.push(k.replace(/^so\|/, '').split('|')[0] + ': ' + nguonKho[k].canh); });
    if (canh.length) h += '<div class="kl-tien hong">⚠ ' + e(canh.slice(0, 3).join(' · ')) + '</div>';
    $('klTien').innerHTML = h;
  }
  function veTom() {
    var p = trang(), el = $('klTom');
    if (!p.tom) { el.innerHTML = ''; return; }
    var b = luoi.dangXem(), nen = gopNay(p) ? BANG_NAY.nen : b.dong, tm = p.tom(nen);
    el.innerHTML = '<b>👉 Tóm lại:</b> <span>' + tm.chu + '</span>' + tm.chip.map(function (x) {
      return /^0 /.test(x[1]) && !S.chk[S.trang + x[0]] ? '' : '<button type="button" class="kl-chip" data-kl="chk" data-v="' + x[0] + '" aria-pressed="' + !!S.chk[S.trang + x[0]] + '">' + e(x[1]) + '</button>';
    }).join('');
  }
  function veCu() {
    var p = trang(), h = '';
    if (benNay(p).length) h += '<button type="button" class="phu" data-kl="ben">' + (S.gonBen ? '▶ Hiện bộ lọc' : '◀ Ẩn bộ lọc') + '</button>';
    if (S.lui.length) h += '<button type="button" data-kl="lui">◀ Quay lại</button>';
    h += '<button type="button" class="phu" data-kl="lam_moi">🔄 Làm mới số</button>';
    if (p.sua) {
      var ds = rowsSua(S.trang).filter(daSua), hong = ds.filter(coLoiO);
      h += '<button type="button" class="chinh" data-kl="luu_sua"' + (ds.length && !hong.length ? '' : ' disabled') + '>💾 Lưu' + (ds.length ? ' ' + ds.length + ' dòng đã sửa' : '') + '</button>';
      if (ds.length) h += '<button type="button" class="phu" data-kl="bo_sua">↺ Bỏ các ô đã sửa</button>';
      if (hong.length) h += '<span class="kl-do">⛔ Còn ô đỏ: bấm ô đó xem cần sửa gì, sửa xong mới lưu được</span>';
      else if (!ds.length) h += '<span class="kl-mo">Chưa sửa ô nào</span>';
    }
    h += '<span class="gian"></span>';
    if (p.nhomCot && !gopNay(p)) h += '<button type="button" class="phu" data-kl="chon_cot">☰ Chọn cột</button>';
    h += '<button type="button" class="phu" data-kl="chep">📋 Chép dán Excel</button><button type="button" class="chinh" data-kl="tai">⬇ Tải Excel</button>';
    $('klCu').innerHTML = h;
  }
  var BANG_NAY = { nen: [] };
  function veBang(giu) {
    var p = trang();
    lanVe = Date.now();
    BANG_NAY = dungBang(p);
    luoi.ve({ khoa: S.trang + '|' + BANG_NAY.gop, cot: BANG_NAY.cot, dong: BANG_NAY.dong, bang: BANG_NAY.bang, rong: p.rong, giuCuon: !!giu, choSua: !!p.sua });
    veTom();
  }
  /** Câu báo riêng của từng trang + hàng nút riêng: chỉ hiện ở đúng trang. */
  function veRieng() {
    var p = trang(), coBao = p.bao || [], co = false;
    ['thnChua', 'thnCanh', 'thnBao', 'gioBao', 'gioXem', 'phBao', 'phCanh'].forEach(function (id) { $(id).hidden = coBao.indexOf(id) < 0; });
    [].forEach.call(document.querySelectorAll('.kl-rieng'), function (x) { var cua = x.getAttribute('data-trang') === p.rieng; x.hidden = !cua; if (cua) co = true; });
    $('klCuRieng').hidden = !co;
    $('klBoGio').hidden = !gioFile();
  }
  function veTrang(giu) {
    var p = trang();
    if (!p) return;
    if (p.truocVe) p.truocVe();
    veTabs(); veRieng(); veBen(); veCu();
    var ghi = p.ghi ? p.ghi() : '';
    $('klChi').innerHTML = p.chi + (ghi ? '<br>ℹ️ ' + e(ghi) : '');
    veTien();
    veBang(giu);
    if (p.can) layThem(p);
  }

  // ================== MÀN TẢI FILE: XEM TRƯỚC + TỚI ĐÚNG Ô SAI (vé 07) ==================
  function xoaTai() {
    if (!daDung) return;
    TAI = null;
    $('klTai').classList.add('an'); $('mTai').classList.remove('co-luoi'); $('klTaiLoi').hidden = true; $('klTaiLoi').innerHTML = '';
    $('klNgan').hidden = true;
  }
  function veTai() {
    var b = TAI.bang[TAI.tab];
    if (!b && TAI.wb) b = TAI.bang[TAI.tab] = bangFile(TAI.wb.Sheets[TAI.tab], TAI.tab, TAI.loi);
    $('klTaiTabs').innerHTML = TAI.tabs.map(function (x) {
      return '<button type="button" class="kl-tab" style="--m:' + MAU.xanhdam + '" data-tai="tab" data-v="' + e(x.k) + '" aria-pressed="' + (x.k === TAI.tab) + '">' + e(x.ten) + (x.so ? '<span class="kl-dem-tab">' + x.so + '</span>' : '') + '</button>';
    }).join('');
    $('klTaiTabs').hidden = TAI.tabs.length < 2;
    luoiTai.ve({ khoa: 'tai|' + (TAI.wb ? 'file' : 'xem') + '|' + TAI.tab, cot: b.cot, dong: b.dong, bang: b.bang || 0, tho: !!TAI.wb, boTieuDe: !!TAI.wb, rong: 'Trang này không có dòng nào.' });
  }
  function hienTai(cau) {
    $('klTaiBao').innerHTML = cau;
    $('klTaiLoi').hidden = !TAI.wb;
    $('klTai').classList.remove('an'); $('mTai').classList.add('co-luoi');
    luoiTai.boLoc();
    veTai();
  }
  /** File đúng: xem trước trong lưới cùng khuôn với trang đã lưu. Nút 💾 và các câu hỏi lại vẫn của noibo.html. */
  function xemTruocFile(kq) {
    var dt = trangThai.dangTai, vt = { ky: dt.ky, ma_ct: dt.ma_ct, ten_ct: dt.ten, dia: '', nguon: '', tinh_trang: '📝 Chưa lưu' }, bang = {}, tabs = [];
    TAI = { bang: bang, tabs: tabs };
    if (dt.loai === 'tam_ung') {
      bang.tru = { cot: cotTru(true), dong: kq.nguoi.map(function (n, i) { return dongTru(n, vt, i + 1, n, '📎 File vừa chọn'); }), bang: 3 };
      tabs.push({ k: 'tru', ten: '➖ Khoản trừ' });
    } else {
      var cong = [], ln = [];
      kq.nguoi.forEach(function (n, i) {
        dongCongNguoi(n, vt, i + 1).forEach(function (r) { cong.push(r); });
        var l = dongLuongNguoi(n, vt, i + 1);
        if (l) ln.push(l);
      });
      bang.cong = { cot: cotCong(cong, true), dong: cong, bang: 4 };
      tabs.push({ k: 'cong', ten: '🗓 Bảng công' });
      if (dt.loai !== 'cong') { bang.luong = { cot: cotLuong(ln, true), dong: ln, bang: 3 }; tabs.unshift({ k: 'luong', ten: '💵 Bảng lương' }); }
    }
    TAI.tab = tabs[0].k;
    hienTai('⚠ <b>Chưa lưu.</b> Đây là file vừa chọn, công nhân chưa thấy gì. Đúng rồi thì bấm <b>💾</b> ở trên, sai thì sửa file rồi bấm <b>📂 Chọn file</b> lại. Bấm tên để xem phiếu một người.');
  }
  /** 👁 Xem bảng máy tính: lưới đủ cột, bấm tên xem từng khoản. */
  function xemBangMay(ds) {
    var ma = {}, x = MAU.xanhdam;
    ds.forEach(function (n) { Object.keys(n.gio || {}).forEach(function (m) { ma[m] = 1; }); });
    var cacMa = THU_TU_CA.filter(function (m) { return ma[m]; });
    var cot = [C('stt', 'STT', 40, { mau: MAU.duong, giua: 1 }), C('ho_ten', 'Họ và tên', 186, { mau: MAU.duong, lien: 1 }), C('cccd_nm', 'CCCD nhà máy', 108, { mau: MAU.duong, giua: 1 }), C('vao', 'Ngày vào', 84, { mau: MAU.duong, kieu: 'ngay', giua: 1 })];
    cacMa.forEach(function (m) { cot.push(C('gio_' + m, ['Số giờ công', m], 60, { mau: MAU.cam, kieu: 'gio', tong: 1 })); });
    cot.push(C('cong_hc', 'Công HC', 62, { mau: MAU.la, kieu: 'gio', tong: 1 }), C('tong_cong', 'Tổng công', 62, { mau: MAU.la, kieu: 'gio', tong: 1 }));
    COT_EXCEL_MAY.forEach(function (c) { cot.push(C(c[1], c[0], 96, { mau: c[1] === 'thuc_linh' ? MAU.ghi : x, kieu: 'tien', tong: 1, dam: c[1] === 'thuc_linh' })); });
    cot.push(C('ky_nhan', 'Ký nhận', 96, { mau: MAU.ghi, kieu: 'tien' }), C('ghi_chu', 'Ghi chú', 170, { mau: MAU.ghi }));
    var dong = ds.map(function (n, i) {
      var r = { stt: i + 1, ho_ten: n.ten_hien, cccd_nm: n.cccd_nha_may, vao: n.ngay_vao, cong_hc: n.cong_hc, tong_cong: n.tong_cong, ky_nhan: n.o.ky_nhan, ghi_chu: n.ghi_chu || '', _may: n };
      cacMa.forEach(function (m) { r['gio_' + m] = (n.gio || {})[m] || 0; });
      COT_EXCEL_MAY.forEach(function (c) { r[c[1]] = n.o[c[1]]; });
      return r;
    });
    TAI = { bang: { may: { cot: cot, dong: dong, bang: 2 } }, tabs: [{ k: 'may', ten: '🧮 Bảng máy tính' }], tab: 'may' };
    hienTai('👉 Bấm tên một người để xem từng khoản. Đủ cột thì bấm <b>⬇ Tải Excel</b> ở trên.');
  }
  function moDongTai(r) {
    if (r._may) moNgan(e(r.ho_ten), '<ul class="loi-ds" style="color:inherit">' + r._may.chi_tiet.map(function (c) { return '<li>' + e(c) + '</li>'; }).join('') + '</ul>');
    else moNguoi(r);
  }
  /** "AB12" hoặc "AB12 → AC12" → chỉ số dòng + cột. Lỗi không có ô, hoặc trang không có trong file, thì null: chỉ có chữ, không có 🔎. */
  function diaChi(l, wb) {
    var m = /^([A-Z]{1,3})(\d+)/.exec(String(l.o || '').toUpperCase().trim());
    if (!m || !l.trang || (wb && !wb.Sheets[l.trang])) return null;
    var c = 0;
    m[1].split('').forEach(function (x) { c = c * 26 + x.charCodeAt(0) - 64; });
    return { r: Number(m[2]) - 1, c: c - 1 };
  }
  /** Một trang của file → lưới thô. Lấy chữ đã định dạng như Excel (ngày không ra số 46000). Chừa đủ dòng, cột trước vùng dữ liệu để địa chỉ trùng Excel. */
  function bangFile(ws, ten, dsLoiFile) {
    if (!ws || !ws['!ref']) return { cot: [], dong: [] };
    var v = XLSX.utils.decode_range(ws['!ref']), dong = [], rong = [], nCot = v.e.c + 1, i;
    for (i = 0; i < v.s.r; i++) dong.push({});
    XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: true }).forEach(function (h) {
      var r = {};
      h.forEach(function (o, j) { if (o !== '') { var c = j + v.s.c; r['c' + c] = o; rong[c] = Math.max(rong[c] || 0, String(o).length); } });
      dong.push(r);
    });
    dsLoiFile.forEach(function (l) {
      var p = diaChi(l);
      if (!p || l.trang !== ten) return;
      while (dong.length <= p.r) dong.push({});
      if (p.c >= nCot) nCot = p.c + 1;
      var r = dong[p.r];
      r._loi = r._loi || {}; r._loi['c' + p.c] = l.loi;
    });
    var cot = [];
    for (i = 0; i < nCot; i++) cot.push(C('c' + i, L.chuCot(i), Math.max(46, Math.min(260, (rong[i] || 0) * 7.5 + 10))));
    return { cot: cot, dong: dong };
  }
  /** File sai: danh sách lỗi có 🔎, bên phải là chính trang đó của file, chữ cái + số dòng trùng Excel, ô lỗi đỏ. Không dựng dòng giả cho người lỗi. */
  function xemLoiFile(wb, kq) {
    var dem = {};
    kq.loi.forEach(function (l) { if (l.trang) dem[l.trang] = (dem[l.trang] || 0) + 1; });
    var dau = kq.loi.filter(function (l) { return diaChi(l, wb); })[0];
    TAI = { wb: wb, loi: kq.loi, bang: {}, tabs: wb.SheetNames.map(function (t) { return { k: t, ten: t, so: dem[t] || 0 }; }), tab: dau ? dau.trang : wb.SheetNames[0] };
    bao('taiBao', 'do', '<b>Chưa lưu được: file còn ' + kq.loi.length + ' lỗi.</b> Bấm 🔎 ở từng lỗi để tới đúng ô. Sửa trong Excel, lưu lại, rồi bấm 📂 Chọn file lần nữa.');
    $('klTaiLoi').innerHTML = kq.loi.slice(0, 300).map(function (l, i) {
      return '<div class="kl-loi"><div>' + (l.trang ? 'Trang <b>' + e(l.trang) + '</b>' : '') + (l.o ? ', ô <b>' + e(l.o) + '</b>' : '') + (l.trang || l.o ? ': ' : '') + e(l.loi) + (l.cach_sua ? ' <span class="sua">→ ' + e(l.cach_sua) + '</span>' : '') + '</div>' +
        (diaChi(l, wb) ? '<button type="button" data-tai="toi" data-v="' + i + '">🔎 Tới ô ' + e(String(l.o).split(/\s/)[0]) + '</button>' : '') + '</div>';
    }).join('') + (kq.loi.length > 300 ? '<div class="kl-loi">… và ' + (kq.loi.length - 300) + ' lỗi nữa. Sửa bớt rồi chọn lại file.</div>' : '');
    hienTai('👉 Bên phải là đúng trang của file, chữ cái cột và số dòng như trong Excel. Ô đỏ là ô đang sai.');
    if (dau) { var p = diaChi(dau, wb); luoiTai.toiO(p.r, p.c); }
  }
  function bamTai(ev) {
    var c = ev.target.closest('[data-tai]');
    if (!c || !TAI) return;
    var v = c.getAttribute('data-v');
    if (c.getAttribute('data-tai') === 'tab') { TAI.tab = v; veTai(); return; }
    var l = TAI.loi[Number(v)], p = diaChi(l, TAI.wb);
    if (TAI.tab !== l.trang) { TAI.tab = l.trang; veTai(); }
    luoiTai.toiO(p.r, p.c);
  }

  // ================== NGĂN BÊN PHẢI ==================
  function moNgan(tieu, than) {
    var n = $('klNgan');
    n.innerHTML = '<div class="kl-ngan-dau"><h2>' + tieu + '</h2><button type="button" data-kl="dong_ngan">✕ Đóng (Esc)</button></div><div class="kl-ngan-than">' + than + '</div>';
    n.hidden = false;
  }
  function dongNgan() { $('klNgan').hidden = true; S.moNgan = null; S.phMo = null; }
  function moViec(r) {
    var c = congTy()[r._i], k = c.ky[r._j];
    S.moNgan = { ma: c.ma_ct, ky: k.ky };
    moNgan(e(c.ten), nutQT(c, r._i) + oKy(k, r._i, r._j));
  }
  function moNguoi(r) {
    var n = r._n, vt = r._vt, h = '';
    h += '<p class="kl-ghi" style="margin-top:0">' + e(vt.ten_ct) + ' · Tháng ' + tenKy(vt.ky) + (n.cccd_nha_may ? ' · CCCD ' + e(n.cccd_nha_may) : '') + (n.ngay_vao ? ' · vào ' + L.ngayVN(n.ngay_vao) : '') + (n.nguoi_tuyen ? ' · người tuyển ' + e(n.nguoi_tuyen) : '') + '</p>';
    if (n.luong && coTien()) {
      h += VePhieu.phieuLuong(n, { cong_ty: vt.ten_ct, ky: vt.ky });
      if (n.ky_nhan === 'KTT') h += '<p class="viec-ke">⚠ Người này có chữ KTT: trang công nhân không hiện bảng công và phiếu lương.</p>';
      if (n.ghi_chu) h += '<p class="kl-ghi">Ghi chú: ' + e(n.ghi_chu) + '</p>';
    } else if (coTien() && !n.luong) h += '<p class="viec-ke">Người này chưa có phiếu lương.</p>';
    if (n.cong) h += VePhieu.bangCong(n);
    moNgan(e(n.ten_hien || n.ten_nha_may || ''), h);
  }
  /** Bấm chữ xanh trong lưới: dòng gộp thì vào trong, dòng thường thì theo trang. */
  function moDong(r) {
    if (r._gop) {
      S.lui.push(JSON.stringify({ tg: S.tg, ct: S.ct, tim: S.tim, tuyen: S.tuyen, gop: S.gop }));
      if (r._gop === 'ma_ct') { S.ct = {}; S.ct[r._khoa] = true; }
      else if (r._gop === 'dia') { S.ct = {}; congTy().forEach(function (c) { if ((c.dia_ban || '(trống)') === r._khoa) S.ct[c.ma_ct] = true; }); }
      else if (r._gop === 'tuyen') { S.tuyen = {}; S.tuyen[r._khoa] = true; S.mo.ai = true; }
      else if (r._gop === 'ky') S.tg = { cap: 'thang', a: r._khoa, b: r._khoa };
      else if (r._gop === 'nguoi') { S.tim = r._mau.cccd_nm || r._mau.ho_ten; S.mo.ai = true; }
      S.gop[S.trang] = '';
      veTrang();
      return;
    }
    var p = trang();
    if (p.mo) p.mo(r);
  }
  function sauSua() { veCu(); }
  function suaRieng(r, c) { var p = trang(); if (p.suaRieng) p.suaRieng(r, c); }

  // ================== SỰ KIỆN ==================
  function moChonCot(nut) {
    var p = trang(), h = $('klHop'), an = S.an[S.trang];
    h.innerHTML = '<b>Chọn nhóm cột muốn xem</b><div class="kl-ghi" style="margin:0">Chép và tải Excel ra đúng các cột đang tích, đúng các dòng đang lọc.</div>' +
      p.nhomCot.map(function (x) { return '<button type="button" class="xl-dong" data-nc="' + x[0] + '" aria-pressed="' + !an[x[0]] + '"><span class="xl-tich"></span><span class="xl-ten">' + e(x[1]) + '</span></button>'; }).join('') +
      '<div class="xl-hang"><button type="button" data-nc-dong="1">Xong</button></div>';
    h.hidden = false;
    var b = nut.getBoundingClientRect();
    h.style.left = Math.max(8, Math.min(window.innerWidth - h.offsetWidth - 8, b.left - 120)) + 'px';
    h.style.top = Math.min(window.innerHeight - h.offsetHeight - 8, b.bottom + 4) + 'px';
    h.onclick = function (ev) {
      var g = ev.target.closest('[data-nc]');
      if (g) { var k = g.getAttribute('data-nc'); an[k] = !an[k]; g.setAttribute('aria-pressed', !an[k]); veBang(true); return; }
      if (ev.target.closest('[data-nc-dong]')) h.hidden = true;
    };
  }
  function bamTrang(ev) {
    var t = ev.target, m = t.closest('[data-mo]');
    if (m) { var r = luoi.dangXem().dong[Number(m.getAttribute('data-mo'))]; if (r) trang().mo(r); return; }
    var c = t.closest('[data-kl]');
    if (!c) return;
    var x = c.getAttribute('data-kl'), v = c.getAttribute('data-v');
    switch (x) {
      case 'luu_sua': var dsSua = rowsSua(S.trang).filter(daSua); if (dsSua.length && !dsSua.some(coLoiO)) trang().luu(dsSua); break;
      case 'bo_sua': hoiRoi(function () { laySua(S.trang); veTrang(true); }); break;
      case 'bo_gio': gio.kq = null; $('gioXem').classList.add('an'); $('nutLuuGio').classList.add('an'); bao('gioBao', '', ''); veTrang(); break;
      case 'dia_n': if (S.diaN[v]) delete S.diaN[v]; else S.diaN[v] = true; veTrang(); break;
      case 'dia_n_het': S.diaN = {}; veTrang(); break;
      case 'phan': S.mo[v] = !S.mo[v]; veBen(); break;
      case 'mo_cay': S.moCay[v] = !S.moCay[v]; veBen(); break;
      case 'cay':
        var ps = v.split('|'), tg = S.tg;
        S.tg = tg && tg.cap === ps[0] && tg.mot && tg.a !== ps[1] ? { cap: ps[0], a: ps[1] < tg.a ? ps[1] : tg.a, b: ps[2] > tg.b ? ps[2] : tg.b, mot: false } : { cap: ps[0], a: ps[1], b: ps[2], mot: true };
        veTrang(); break;
      case 'chk': S.chk[S.trang + v] = !S.chk[S.trang + v]; veTrang(); break;
      case 'lai': if (trangThai.luoi) S.tg = thangMacDinh(); S.ct = {}; S.diaN = {}; S.tim = ''; S.tuyen = {}; S.gop = {}; S.chk = {}; S.lui = []; S.timCT = ''; luoi.boLoc(); veTrang(); break;
      case 'ct_het': S.ct = {}; veTrang(); break;
      case 'ct': if (S.ct[v]) delete S.ct[v]; else S.ct[v] = true; veTrang(); break;
      case 'dia':
        var ds = congTy().filter(function (z) { return (z.dia_ban || '(Chưa ghi địa bàn)') === v; }), het = ds.every(function (z) { return S.ct[z.ma_ct]; });
        ds.forEach(function (z) { if (het) delete S.ct[z.ma_ct]; else S.ct[z.ma_ct] = true; });
        veTrang(); break;
      case 'mo_dia': S.moDia[v] = !S.moDia[v]; veBen(); break;
      case 'tuyen': if (S.tuyen[v]) delete S.tuyen[v]; else S.tuyen[v] = true; veTrang(); break;
      case 'gop': S.gop[S.trang] = v; veTrang(); break;
      case 'ben': S.gonBen = !S.gonBen; veBen(); veCu(); break;
      case 'lui':
        var cu = JSON.parse(S.lui.pop());
        S.tg = cu.tg; S.ct = cu.ct; S.tim = cu.tim; S.tuyen = cu.tuyen; S.gop = cu.gop;
        veTrang(); break;
      case 'chep': luoi.chep(); break;
      case 'tai':
        var p = trang(), t2 = cacThang();
        if (p.tai) { p.tai(); break; }
        L.taiTep([luoi.trangExcel(p.ten.replace(/^[^\wÀ-ỹ]+/, ''))], (p.ten_tep || 'Bang') + ' ' + (t2.length ? t2[0] + (t2.length > 1 ? ' den ' + t2[t2.length - 1] : '') : '') + '.xlsx', baoNhanh);
        break;
      case 'chon_cot': if ($('klHop').hidden) moChonCot(c); else $('klHop').hidden = true; break;
      case 'dong_ngan': dongNgan(); break;
      case 'thu_lai': LOI = {}; LOI_SO = ''; Object.keys(KHO_SO).forEach(function (k) { if (!KHO_SO[k].length) delete KHO_SO[k]; }); if (KHO_SUA[S.trang] && KHO_SUA[S.trang].loi) delete KHO_SUA[S.trang]; veTrang(true); break;
      case 'lam_moi':
        hoiRoi(function () {
          KHO = {}; LOI = {}; KHO_SO = {}; KHO_SS = {}; KHO_SUA = {}; DA_HOI = {}; LOI_SO = '';
          if (chiXuLyPH()) { veTrang(true); return; }                  // Quản lý, Trưởng nhóm không có kt_luoi
          dangChuyen = true; taiLuoi();
        });
        break;
    }
  }
  var henGo = 0;
  function goTrang(ev) {
    var t = ev.target;
    if (t.id === 'klTimCT') { S.timCT = t.value; $('klDsCT').innerHTML = dsCT(L.boDau(t.value)); }
    if (t.id === 'klTimNguoi') { S.tim = t.value; clearTimeout(henGo); henGo = setTimeout(function () { veBang(); }, 250); }
  }
  /** Mặc định: tháng mới nhất có số trong các công ty; chưa có gì thì tháng trước. */
  function thangMacDinh() {
    var ky = '';
    congTy().forEach(function (c) { c.ky.forEach(function (k) { if (k.co_file && k.ky > ky) ky = k.ky; }); });
    if (!ky) { var n = thangNay(), y = +n.substring(0, 4), m = +n.substring(5, 7) - 1; if (!m) { y--; m = 12; } ky = y + '-' + ('0' + m).slice(-2); }
    S.moCay[ky.substring(0, 4)] = true; S.moCay[ky.substring(0, 4) + '-Q' + Math.ceil(+ky.substring(5, 7) / 3)] = true;
    return { cap: 'thang', a: ky, b: ky, mot: true };
  }
  function moTrang(t) {
    hoiRoi(function () {
      S.trang = t; S.moNgan = null; S.phMo = null;
      if (!S.tg && trangThai.luoi) S.tg = thangMacDinh();
      dangChuyen = true; hien('mKL'); dangChuyen = false;
      veTrang();
    });
  }

  // ================== NỐI VỚI noibo.html ==================
  /** Sau khi đăng nhập. Chỉ có quản lý, trưởng nhóm thì chỉ có Phản hồi (không gọi được kt_luoi). */
  function vao() {
    dung();
    if (chiXuLyPH()) { moTrang('ph'); return; }
    taiLuoi();
  }
  /** taiLuoi xong: có số công ty mới. Giữ tab đang đứng nếu vừa bấm 🔄; ngăn đang mở thì mở lại bản mới. */
  function luoiMoi() {
    if (!tgDaDat) { S.tg = thangMacDinh(); tgDaDat = true; }
    dangChuyen = false;
    veTrang(true);
    if (S.moNgan && S.trang === 'viec') {
      var ma = S.moNgan.ma, ky = S.moNgan.ky, r = TRANG.viec.dong().filter(function (x) { return x.ma_ct === ma && x.ky === ky; })[0];
      if (r) moViec(r); else dongNgan();
    }
  }
  /** Mỗi lần noibo.html đổi màn. Màn thẻ `mLuoi` đã được đổi thành mKL ở hien(). */
  function sauHien(id) {
    var dn = id === 'mDangNhap';
    document.body.classList.toggle('kl', !dn);
    $('klTabs').classList.toggle('an', dn);
    if (dn) return;
    if ($('klNgan')) $('klNgan').hidden = true;                        // đổi màn thì ẩn ngăn; S.moNgan còn đó để mở lại khi quay về
    if (id === 'mKL' && !dangChuyen) S.trang = 'viec';
    veTabs();
  }
  function dangXuat() {
    KHO = {}; LOI = {}; DANG = {}; KHO_SO = {}; KHO_SS = {}; KHO_SUA = {}; DA_HOI = {}; LOI_SO = ''; dangLay = null; tgDaDat = false; TAI = null;
    S.ct = {}; S.tim = ''; S.tuyen = {}; S.gop = {}; S.chk = {}; S.lui = []; S.moNgan = null; S.phMo = null; S.diaN = {}; S.tg = null; S.trang = 'viec';
    if (luoi) { luoi.boLoc(); luoi.ve({ khoa: 'trong', cot: [], dong: [], bang: 0 }); }
    if (luoiTai) { luoiTai.boLoc(); luoiTai.ve({ khoa: 'trong', cot: [], dong: [], bang: 0 }); }
    if ($('klNgan')) { $('klNgan').hidden = true; $('klNgan').innerHTML = ''; }
    if ($('klTai')) xoaTai();
  }
  /** Gọi từ noibo.html khi số của trang vừa về. Trang khác đang mở thì khỏi vẽ, lúc mở sẽ vẽ. */
  function thangNMoi() {
    if (thn.kq && DA_HOI.thangn && thn.kq.thang !== DA_HOI.thangn) { DA_HOI.thangn = null; }   // bấm đổi tháng nhanh, cú cũ về sau cú mới: hỏi lại đúng tháng đang chọn
    if (S.trang === 'thangn') veTrang(true);
  }
  function gioMoi() { if (S.trang === 'gio') veTrang(); }
  function vePHLuoi() {
    if (S.trang !== 'ph') return;
    veTrang(true);
    if (S.phMo && !$('klNgan').hidden) { var v = timViecPH(S.phMo); if (v) moNgan('💬 ' + e(v.ho_ten), theViecPH(v)); }
  }
  /** ⚖ ở ô tháng: sang tab So máy–file đã lọc đúng công ty × tháng, chỉ dòng lệch. */
  function soMay(ma, ky) {
    S.lui.push(JSON.stringify({ tg: S.tg, ct: S.ct, tim: S.tim, tuyen: S.tuyen, gop: S.gop }));
    S.ct = {}; S.ct[ma] = true; S.tg = { cap: 'thang', a: ky, b: ky, mot: true }; S.gop.so = ''; S.chk.solech = true;
    dongNgan(); moTrang('so');
  }
  /** 📐 ở ngăn phải: sang tab Quy tắc lương đã lọc đúng công ty. */
  function moQuyTac(ma) {
    S.lui.push(JSON.stringify({ tg: S.tg, ct: S.ct, tim: S.tim, tuyen: S.tuyen, gop: S.gop }));
    S.ct = {}; S.ct[ma] = true;
    dongNgan(); moTrang('qt');
  }
  /** 👁 Xem bảng lương ở ô tháng: sang tab Bảng lương đã lọc đúng công ty × tháng. */
  function xemLuong(ma, ky) {
    S.lui.push(JSON.stringify({ tg: S.tg, ct: S.ct, tim: S.tim, tuyen: S.tuyen, gop: S.gop }));
    S.ct = {}; S.ct[ma] = true; S.tg = { cap: 'thang', a: ky, b: ky, mot: true }; S.gop.luong = '';
    dongNgan(); moTrang('luong');
  }
  /** Nút đổi kiểu trên thanh trên. Điện thoại không có nút này: giữ nguyên như cũ. */
  function ganNutKieu() {
    if (!manRong() || $('klNutKieu')) return;
    var b = document.createElement('button');
    b.id = 'klNutKieu'; b.type = 'button'; b.className = 'kl-nut-kieu';
    b.textContent = dangBat() ? '📱 Kiểu thẻ' : '🧾 Kiểu lưới';
    b.title = dangBat() ? 'Về giao diện thẻ như trước, phòng khi lưới trục trặc' : 'Về giao diện lưới như Excel';
    b.addEventListener('click', function () { nho(KHOA_KIEU, dangBat() ? 'the' : null); location.reload(); });
    $('thanhTK').insertBefore(b, $('nutThoat'));
  }

  return {
    dangBat: dangBat, vao: vao, luoiMoi: luoiMoi, sauHien: sauHien, dangXuat: dangXuat, xemLuong: xemLuong, ganNutKieu: ganNutKieu,
    xoaTai: xoaTai, xemTruocFile: xemTruocFile, xemLoiFile: xemLoiFile, xemBangMay: xemBangMay, soMay: soMay, moQuyTac: moQuyTac, thangNMoi: thangNMoi, gioMoi: gioMoi, vePH: vePHLuoi, hoiRoi: hoiRoi,
    thuan: { dongCongNguoi: dongCongNguoi, dongCongGop: dongCongGop, dongLuongNguoi: dongLuongNguoi, nguoiTuSo: nguoiTuSo, maCaCo: maCaCo, ngayCo: ngayCo, cotCong: cotCong, cotLuong: cotLuong, laMoi: laMoi, chuTuHtml: chuTuHtml, thuCua: thuCua,
             dongTru: dongTru, dongSoNguoi: dongSoNguoi, dongQT: dongQT, boTuDong: boTuDong, diaChi: diaChi }
  };
})();
