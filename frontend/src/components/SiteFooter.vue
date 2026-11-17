<script setup>
import { ArrowUpRight, Instagram, Mail, MapPin } from "lucide-vue-next";
</script>
<template>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-intro">
          <p class="overline">A CUP ABOVE THE ORDINARY</p>
          <h2>Cà phê ngon.<br /><em>Ngày thêm đẹp.</em></h2>
          <p>
            Một góc nhỏ để tìm về hương vị thật. Từ ly cà phê mỗi sáng đến những
            hạt rang nguyên chất cho ngôi nhà của bạn.
          </p>
        </div>
        <div class="footer-links-col">
          <p class="footer-heading">KHÁM PHÁ</p>
          <RouterLink to="/menu">Toàn bộ thực đơn</RouterLink
          ><RouterLink :to="{ name: 'menu', query: { type: 'DO_UONG' } }"
            >Thức uống</RouterLink
          ><RouterLink :to="{ name: 'menu', query: { type: 'DONG_GOI' } }"
            >Cà phê nguyên chất</RouterLink
          >
        </div>
        <div class="footer-links-col">
          <p class="footer-heading">HỖ TRỢ</p>
          <RouterLink to="/cart">Giỏ hàng</RouterLink
          ><RouterLink to="/account">Tài khoản của tôi</RouterLink
          ><RouterLink to="/login">Đăng nhập</RouterLink>
        </div>
        <div class="footer-links-col">
          <p class="footer-heading">KẾT NỐI</p>
          <span><MapPin :size="15" /> Việt Nam</span
          ><span><Mail :size="15" /> Liên hệ qua quán</span
          ><span><Instagram :size="15" /> coffeShop</span>
        </div>
      </div>
      <div class="footer-bottom">
        <span
          >© {{ new Date().getFullYear() }} coffeShop. Crafted with care.</span
        ><span>COFFEE FIRST, ALWAYS <ArrowUpRight :size="14" /></span>
      </div>
    </div>
  </footer>
</template>
