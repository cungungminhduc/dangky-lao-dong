/**
 * VietQR cho hệ công–lương (kỳ lương ngắn + chuyển khoản, vé 06). HÀM THUẦN: không DOM, chạy được trong trình duyệt lẫn Node.
 * Gán globalThis.VietQR = { doc, dung, crc }.
 *
 *   doc(chuoi)  → { ok:true, bin, so_tk, ten } | { ok:false, ly_do }
 *       ten = '' khi QR không có nhánh 59. ly_do: 'rong' (không có chuỗi) · 'khong_phai_vietqr' (không phải TLV EMVCo, thiếu nhánh 38 / 63,
 *       không phải khoá NAPAS A000000727, thiếu BIN 6 số / số tài khoản) · 'crc' (sai mã kiểm) · 'the' (QRIBFTTC: QR số thẻ, không phải tài khoản).
 *   dung({ bin, so_tk, tien?, noi_dung? }) → chuỗi VietQR "chuyển tiền đến tài khoản" (vé 08 vẽ thành mã QR). Đầu vào sai → ném Error rõ.
 *   crc(chuoi)  → 4 ký tự HEX IN HOA, CRC-16/CCITT-FALSE (đa thức 0x1021, khởi đầu 0xFFFF, không đảo bit, không XOR cuối).
 *
 * Cấu trúc (EMVCo TLV: 2 số mã + 2 số độ dài + giá trị):
 *   00 "01" · 01 "11" (tĩnh) | "12" (có số tiền) · 38 [00 "A000000727" · 01 [00 BIN6 · 01 số TK] · 02 "QRIBFTTA"] · 53 "704" · 54 số tiền · 58 "VN"
 *   · 59 tên (chỉ khi đọc) · 62 [08 nội dung] · 63 CRC (tính trên cả chuỗi tới hết "6304").
 */
(function (goc) {
  'use strict';

  var KHOA_NAPAS = 'A000000727';

  function crc(chuoi) {
    var s = String(chuoi == null ? '' : chuoi), c = 0xFFFF;
    for (var i = 0; i < s.length; i++) {
      c ^= (s.charCodeAt(i) & 0xFF) << 8;
      for (var b = 0; b < 8; b++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
    }
    return ('0000' + c.toString(16).toUpperCase()).slice(-4);
  }

  /** Tách chuỗi TLV → [{ ma, gt, bat }] (bat = vị trí bắt đầu nhánh trong chuỗi); hỏng (mã / độ dài không phải số, tràn, dư) → null. */
  function tach(s) {
    var ra = [], i = 0;
    while (i < s.length) {
      if (i + 4 > s.length) return null;
      var ma = s.substr(i, 2), dai = s.substr(i + 2, 2);
      if (!/^\d\d$/.test(ma) || !/^\d\d$/.test(dai)) return null;
      var n = parseInt(dai, 10);
      if (i + 4 + n > s.length) return null;
      ra.push({ ma: ma, gt: s.substr(i + 4, n), bat: i });
      i += 4 + n;
    }
    return ra;
  }
  function lay(ds, ma) {
    for (var i = 0; i < ds.length; i++) if (ds[i].ma === ma) return ds[i];
    return null;
  }
  function hong() { return { ok: false, ly_do: 'khong_phai_vietqr' }; }

  /** Mã ẩn thay số thật trong QR "nhận tiền" (vd. MB: VQRQACEXR0638): 6–19 chữ HOA + số, có ít nhất một chữ. Ngân hàng người chuyển tự đổi ra tài khoản thật lúc quét. */
  function laMaAn(s) { return typeof s === 'string' && /^[0-9A-Z]{6,19}$/.test(s) && /[A-Z]/.test(s); }

  function doc(chuoi) {
    if (typeof chuoi !== 'string' || chuoi.trim() === '') return { ok: false, ly_do: 'rong' };
    var s = chuoi.trim();
    var ds = tach(s);
    if (!ds) return hong();
    var n63 = lay(ds, '63');
    if (!n63 || n63.gt.length !== 4 || ds[ds.length - 1] !== n63) return hong();
    if (crc(s.substring(0, n63.bat + 4)) !== n63.gt.toUpperCase()) return { ok: false, ly_do: 'crc' };
    var n38 = lay(ds, '38');
    if (!n38) return hong();
    var tr = tach(n38.gt), k00 = tr && lay(tr, '00'), k01 = tr && lay(tr, '01');
    if (!k00 || k00.gt !== KHOA_NAPAS || !k01) return hong();
    var con = tach(k01.gt), bin = con && lay(con, '00'), so = con && lay(con, '01');
    if (!bin || !/^\d{6}$/.test(bin.gt) || !so || so.gt === '') return hong();
    var k02 = lay(tr, '02');
    if (k02 && k02.gt === 'QRIBFTTC') return { ok: false, ly_do: 'the' };
    var n59 = lay(ds, '59');
    var ten = n59 ? n59.gt.replace(/\s+/g, ' ').trim().toUpperCase() : '';
    if (laMaAn(so.gt)) return { ok: true, bin: bin.gt, so_tk: so.gt, ten: ten, ma_an: true };
    if (!/^\d+$/.test(so.gt)) return hong();
    return { ok: true, bin: bin.gt, so_tk: so.gt, ten: ten };
  }

  function nhanh(ma, gt) { return ma + ('0' + gt.length).slice(-2) + gt; }

  /** Bỏ dấu tiếng Việt, IN HOA, chỉ giữ A–Z 0–9 và dấu cách, gộp cách thừa, cắt 25 ký tự. */
  function chuanNoiDung(nd) {
    if (nd == null) return '';
    var t = String(nd).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();
    t = t.replace(/[^A-Z0-9 ]/g, '').replace(/ +/g, ' ').trim();
    return t.substring(0, 25).trim();
  }

  function dung(x) {
    if (!x || typeof x !== 'object') throw new Error('VietQR.dung: thiếu thông tin tài khoản (bin, so_tk).');
    if (typeof x.bin !== 'string' || !/^\d{6}$/.test(x.bin)) throw new Error('VietQR.dung: bin phải là chuỗi 6 chữ số.');
    if (typeof x.so_tk !== 'string' || !(/^\d{6,19}$/.test(x.so_tk) || laMaAn(x.so_tk))) throw new Error('VietQR.dung: so_tk phải là chuỗi 6 đến 19 chữ số (kiểu chuỗi để không mất số 0 đầu).');
    var tien = '';
    if (x.tien != null) {
      var ok = (typeof x.tien === 'number' && isFinite(x.tien) && Math.floor(x.tien) === x.tien) || (typeof x.tien === 'string' && /^\d+$/.test(x.tien));
      var n = ok ? Number(x.tien) : NaN;
      if (!(n >= 1) || n > 9999999999999) throw new Error('VietQR.dung: tien phải là số nguyên dương (đồng), nhận được: ' + String(x.tien));
      tien = String(n);
    }
    var nd = chuanNoiDung(x.noi_dung);
    var t = nhanh('00', '01') + nhanh('01', tien ? '12' : '11') +
      nhanh('38', nhanh('00', KHOA_NAPAS) + nhanh('01', nhanh('00', x.bin) + nhanh('01', x.so_tk)) + nhanh('02', 'QRIBFTTA')) +
      nhanh('53', '704') + (tien ? nhanh('54', tien) : '') + nhanh('58', 'VN') + (nd ? nhanh('62', nhanh('08', nd)) : '') + '6304';
    return t + crc(t);
  }

  goc.VietQR = { doc: doc, dung: dung, crc: crc };
})(typeof globalThis !== 'undefined' ? globalThis : this);
