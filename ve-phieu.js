/**
 * VẼ PHIẾU LƯƠNG + BẢNG CÔNG của MỘT người — dùng chung cho trang nội bộ (xem trước) và trang công nhân,
 * để kế toán thấy ĐÚNG thứ công nhân sẽ thấy. Đầu vào là bản ghi do doc-file-luong.js tạo.
 * Trình bày theo khuôn trang "3.Phiếu lương" của file: I. Lương · II. Phụ cấp · III. Khấu trừ · IV. Thực lĩnh.
 */
(function (goc) {
  'use strict';

  function e(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function tien(n) { return n == null ? '–' : Number(n).toLocaleString('vi-VN'); }
  function gio(n) { return n == null || n === 0 ? '–' : String(n).replace('.', ','); }
  var THU = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  function ngayNgan(iso) {
    var p = iso.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return THU[d.getUTCDay()] + ' ' + p[2] + '/' + p[1];
  }

  /** tt = { don_vi, cong_ty, ky: 'yyyy-MM', dia_ban } */
  function phieuLuong(n, tt) {
    var l = n.luong, k = tt.ky || '';
    function nhom(so, ten, tong, dong, coGio) {
      var h = '<tr class="muc"><td>' + so + '</td><td>' + e(ten) + '</td><td></td><td class="so">' + tien(tong) + '</td></tr>';
      dong.forEach(function (x, i) {
        h += '<tr><td>' + (i + 1) + '</td><td>' + e(x.ten) + '</td><td class="so">' + (coGio ? gio(x.gio) : '') +
             '</td><td class="so">' + tien(x.tien) + '</td></tr>';
      });
      return h;
    }
    return '<div class="phieu">' +
      '<div class="ph-dv">Đơn vị: ' + e(tt.cong_ty || '') + '</div>' +
      '<div class="ph-tieude">BẢNG KÊ TIỀN LƯƠNG THÁNG ' + e(k.substring(5) + '/' + k.substring(0, 4)) + '</div>' +
      '<div class="ph-ten">Họ và tên: <b>' + e(n.ten_hien) + '</b></div>' +
      (n.ten_nha_may && n.ten_nha_may.toLowerCase() !== String(n.ten_hien).toLowerCase()
        ? '<div class="ph-phu">Hồ sơ nhà máy: ' + e(n.ten_nha_may) + '</div>' : '') +
      '<table class="bang"><thead><tr><th>STT</th><th>Cơ cấu lương</th><th>Số giờ</th><th>Số tiền (đ)</th></tr></thead><tbody>' +
      nhom('I', 'Lương', l.tong_luong, l.luong, true) +
      nhom('II', 'Các khoản phụ cấp', l.tong_phu_cap, l.phu_cap, false) +
      nhom('III', 'Các khoản khấu trừ', l.tong_khau_tru, l.khau_tru, false) +
      '<tr class="tong"><td>IV</td><td>Thực lĩnh (I + II − III)</td><td></td><td class="so">' + tien(l.thuc_linh) + '</td></tr>' +
      '</tbody></table></div>';
  }

  var TEN_NGHI = { np: 'Nghỉ phép', kp: 'Không phép', ld: 'Lưu động', nv: 'Nghỉ việc', nn: 'Nghỉ ngang', cv: 'Chờ việc',
                   cg: 'Cắt giảm', tsa: 'Tổng suất ăn' };

  /** Bảng công theo ngày — chỉ ngày có làm, mỗi ngày ghi giờ từng loại ca. Không kéo ngang trên điện thoại. */
  function bangCong(n) {
    var c = n.cong;
    var tongCa = c.ca.filter(function (x) { return x.tong; })
      .map(function (x) { return '<li><span>' + e(x.ten) + '</span><b>' + gio(x.tong) + ' giờ</b></li>'; }).join('');
    var nghi = Object.keys(c.nghi || {}).map(function (k) { return e(TEN_NGHI[k] || k) + ': ' + gio(c.nghi[k]); }).join(' · ');
    var h = '<div class="cong"><div class="cong-tong"><b>Tổng giờ theo loại ca</b><ul>' + (tongCa || '<li>Không có giờ công</li>') + '</ul>' +
            (nghi ? '<div class="ph-phu">' + nghi + '</div>' : '') + '</div>';
    if (!c.co_chi_tiet) return h + '<p class="bao">Chưa có bảng công chi tiết từng ngày.</p></div>';
    var dong = '';
    c.ngay.forEach(function (ngay, j) {
      if (!ngay) return;
      var o = c.ca.filter(function (x) { return x.gio[j] != null && x.gio[j] !== 0; })
        .map(function (x) { return e(x.ten) + ' <b>' + e(gio(x.gio[j])) + '</b>'; });
      if (o.length) dong += '<li><span class="ngay">' + ngayNgan(ngay) + '</span><span>' + o.join(' · ') + '</span></li>';
    });
    return h + '<b>Từng ngày đi làm</b><ul class="ngay-lam">' + dong + '</ul></div>';
  }

  /**
   * Hạng mục phản hồi của công nhân — hạng mục quyết định ai nhận (đặc tả mục 0c, Dương chốt 06/11/2026); `vai` = chữ công nhân thấy
   * thay cho tên người. Bản GIỐNG HỆT HANG_MUC_PH ở Code.gs — bộ kiểm so hai bên.
   */
  var HANG_MUC = {
    cong: { ten: '🕒 Bảng công sai', vai: 'quản lý công ty' },
    luong: { ten: '💵 Phiếu lương sai', vai: 'quản lý công ty' },
    nha_o: { ten: '🏠 Nhà ở, đưa đón', vai: 'quản lý công ty' },
    trong_xuong: { ten: '🏭 Trong xưởng, công việc', vai: 'quản lý công ty' },
    phan_anh_ql: { ten: '🙊 Phản ánh về quản lý công ty', vai: 'trưởng nhóm' },
    phan_anh_tn: { ten: '🙊 Phản ánh về trưởng nhóm', vai: 'giám đốc' },
    khac: { ten: '✍️ Khác', vai: 'quản lý công ty' }
  };

  /**
   * Những gì công nhân chọn được khi báo sai, đúng thứ tự trên phiếu: [{ ma: mã gửi máy chủ, ten: nhãn, them: html số giờ / số tiền, nhom }].
   * `nhom` = mục thu gọn (tuần / I / II / III), không có thì đứng riêng một dòng. `ma` + `ten` giống hệt mucChonPH_ ở Code.gs — bộ kiểm so
   * hai bên. Hạng mục khác → [] (không phải chọn).
   */
  function mucChon(hm, n) {
    var ra = [];
    if (hm === 'cong') {
      var c = n.cong;
      if (c.co_chi_tiet) {
        c.ngay.forEach(function (ngay, j) {
          if (!ngay) return;
          var o = c.ca.filter(function (x) { return x.gio[j] != null && x.gio[j] !== 0; })
            .map(function (x) { return e(x.ten) + ' <b>' + e(gio(x.gio[j])) + '</b>'; });
          ra.push({ ma: ngay, ten: ngayNgan(ngay), them: o.length ? o.join(' · ') : 'Không có giờ' });
        });
        ra.forEach(function (x, i) {                  // 7 ngày một tuần, tính từ đầu kỳ
          var dau = i - i % 7, cuoi = Math.min(dau + 6, ra.length - 1);
          x.nhom = 'Tuần ' + (dau / 7 + 1) + ' · ' + ra[dau].ten.substring(3) + ' → ' + ra[cuoi].ten.substring(3);
        });
      } else {
        c.ca.forEach(function (x) {
          ra.push({ ma: 'CA:' + x.ma, ten: 'Tổng giờ ' + x.ten, them: x.tong ? '<b>' + gio(x.tong) + '</b> giờ' : 'Không có giờ' });
        });
      }
    } else if (hm === 'luong') {
      var l = n.luong;
      [['I', 'I. Lương', l.luong], ['II', 'II. Các khoản phụ cấp', l.phu_cap], ['III', 'III. Các khoản khấu trừ', l.khau_tru]].forEach(function (nh) {
        nh[2].forEach(function (x, i) {
          var ma = nh[0] + '.' + (i + 1);
          ra.push({ ma: ma, ten: ma + ' ' + x.ten, them: x.tien == null ? '–' : '<b>' + tien(x.tien) + '</b> đ', nhom: nh[1] });
        });
      });
      ra.push({ ma: 'IV', ten: 'IV Thực lĩnh', them: '<b>' + tien(l.thuc_linh) + '</b> đ' });
    }
    return ra;
  }

  goc.VePhieu = { phieuLuong: phieuLuong, bangCong: bangCong, tien: tien, e: e, HANG_MUC: HANG_MUC, mucChon: mucChon };
})(typeof window !== 'undefined' ? window : globalThis);
