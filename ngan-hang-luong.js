/**
 * Danh sách ngân hàng cho thẻ 🏦 "Tài khoản nhận lương" của luong.html (kỳ ngắn vé 05; vé 06 đọc QR dùng lại cột bin).
 * bin = mã 6 số của ngân hàng trong hệ thống VietQR / NAPAS. Mục cuối "Khác (gõ tên)" có bin rỗng: công nhân gõ tên ngân hàng.
 * Thêm ngân hàng thì chèn TRƯỚC mục "Khác". Tệp này lên GitHub cùng luong.html.
 */
var NGAN_HANG = [
  { bin: '970436', ten: 'Vietcombank', ten_day: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
  { bin: '970415', ten: 'VietinBank', ten_day: 'Ngân hàng TMCP Công thương Việt Nam' },
  { bin: '970418', ten: 'BIDV', ten_day: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { bin: '970405', ten: 'Agribank', ten_day: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam' },
  { bin: '970407', ten: 'Techcombank', ten_day: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
  { bin: '970422', ten: 'MB Bank', ten_day: 'Ngân hàng TMCP Quân đội' },
  { bin: '970416', ten: 'ACB', ten_day: 'Ngân hàng TMCP Á Châu' },
  { bin: '970432', ten: 'VPBank', ten_day: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { bin: '970423', ten: 'TPBank', ten_day: 'Ngân hàng TMCP Tiên Phong' },
  { bin: '970403', ten: 'Sacombank', ten_day: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { bin: '970437', ten: 'HDBank', ten_day: 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh' },
  { bin: '970441', ten: 'VIB', ten_day: 'Ngân hàng TMCP Quốc tế Việt Nam' },
  { bin: '970443', ten: 'SHB', ten_day: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { bin: '970448', ten: 'OCB', ten_day: 'Ngân hàng TMCP Phương Đông' },
  { bin: '970426', ten: 'MSB', ten_day: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
  { bin: '', ten: 'Khác (gõ tên)', ten_day: '' }
];
