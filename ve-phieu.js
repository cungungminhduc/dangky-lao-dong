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

  goc.VePhieu = { phieuLuong: phieuLuong, bangCong: bangCong, tien: tien, e: e };
})(typeof window !== 'undefined' ? window : globalThis);
