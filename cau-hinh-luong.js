/* ============================================================
 * CẤU HÌNH NỐI TRANG ↔ MÁY CHỦ CÔNG–LƯƠNG
 * ============================================================
 *   URL_API   = link /exec của Apps Script công–lương (Triển khai → Quản lý bản triển khai)
 *   TOKEN_API = Sheet công–lương → menu ⚙ Công–lương → Xem mã bí mật API (token)
 *
 * ⚠️ Đây là hệ RIÊNG, KHÁC hệ tuyển dụng, nhưng nằm CHUNG kho GitHub. Đừng đổi tên tệp này thành cau-hinh.js: tải lên là đè
 *    tệp của hệ tuyển dụng, mọi trang đăng ký / đón / danh sách trỏ sang máy chủ lương và ngừng chạy.
 * Để trống thì trang hiện dải đỏ "Chưa nối máy chủ".
 */
var URL_API   = 'https://script.google.com/macros/s/AKfycbya01P7jN99F9P9aEplMYp1iVUcOxlcwHelKD_QAR0dy_mhoRfINXnWB_jkiRG8usBikg/exec';
var TOKEN_API = 'b51278eeb23144dca2ece165';
// URL_XEM = link máy chủ xem trên Cloudflare. Xoá link (để '') là lùi ngay về gọi thẳng Apps Script.
var URL_XEM = 'https://cong-luong-may-chu-xem.video-qr.workers.dev';
