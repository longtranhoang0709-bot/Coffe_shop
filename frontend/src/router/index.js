import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomeView.vue"),
    meta: { title: "Trang chủ" },
  },
  {
    path: "/menu",
    name: "menu",
    component: () => import("../views/MenuView.vue"),
    meta: { title: "Thực đơn" },
  },
  {
    path: "/products/:id",
    name: "product-detail",
    component: () => import("../views/ProductDetailView.vue"),
    meta: { title: "Chi tiết sản phẩm" },
  },
  {
    path: "/cart",
    name: "cart",
    component: () => import("../views/CartView.vue"),
    meta: { title: "Giỏ hàng" },
  },
  {
    path: "/my-orders",
    name: "my-orders",
    component: () => import("../views/MyOrdersView.vue"),
    meta: { requiresAuth: true, title: "Đơn hàng của tôi" },
  },
  {
    path: "/my-orders/:id",
    name: "order-detail",
    component: () => import("../views/OrderDetailView.vue"),
    meta: { requiresAuth: true, title: "Chi tiết đơn hàng" },
  },
  {
    path: "/guest-order",
    name: "guest-order",
    component: () => import("../views/GuestOrderLookupView.vue"),
    meta: { title: "Tra cứu đơn khách" },
  },
  {
    path: "/payment-result",
    name: "payment-result",
    component: () => import("../views/PaymentResultView.vue"),
    meta: { title: "Kết quả VNPay" },
  },
  {
    path: "/checkout",
    name: "checkout",
    component: () => import("../views/CheckoutView.vue"),
    meta: { title: "Đặt hàng" },
  },
  {
    path: "/order-success",
    name: "order-success",
    component: () => import("../views/OrderSuccessView.vue"),
    meta: { title: "Đặt hàng thành công" },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("../views/LoginView.vue"),
    meta: { title: "Đăng nhập" },
  },
  {
    path: "/register",
    name: "register",
    component: () => import("../views/RegisterView.vue"),
    meta: { title: "Đăng ký" },
  },
  {
    path: "/account",
    name: "account",
    component: () => import("../views/ProfileView.vue"),
    meta: { requiresAuth: true, title: "Tài khoản" },
  },
  // Module 5-7: moi trang Admin va Staff dung mot layout, tieu de va quyen duoc kiem tra tai router.
  {
    path: "/admin",
    component: () => import("../components/admin/AdminShell.vue"),
    meta: { requiresAuth: true, roles: ["ADMIN"], adminArea: true },
    children: [
      {
        path: "",
        name: "admin",
        component: () => import("../views/admin/DashboardView.vue"),
        meta: { title: "Tổng quan" },
      },
      {
        path: "products",
        name: "admin-products",
        component: () => import("../views/admin/ProductsView.vue"),
        meta: { title: "Sản phẩm" },
      },
      {
        path: "categories",
        name: "admin-categories",
        component: () => import("../views/admin/CategoriesView.vue"),
        meta: { title: "Danh mục" },
      },
      {
        path: "inventory",
        name: "admin-inventory",
        component: () => import("../views/admin/InventoryView.vue"),
        meta: { title: "Tồn kho" },
      },
      {
        path: "promotions",
        name: "admin-promotions",
        component: () => import("../views/admin/PromotionsView.vue"),
        meta: { title: "Mã giảm giá" },
      },
      {
        path: "shipping",
        name: "admin-shipping",
        component: () => import("../views/admin/ShippingView.vue"),
        meta: { title: "Khu vực giao hàng" },
      },
      {
        path: "customers",
        name: "admin-customers",
        component: () => import("../views/admin/CustomersView.vue"),
        meta: { title: "Người dùng" },
      },
      {
        path: "orders",
        name: "admin-orders",
        component: () => import("../views/admin/OrdersView.vue"),
        meta: { title: "Đơn hàng" },
      },
      {
        path: "revenue",
        name: "admin-revenue",
        component: () => import("../views/admin/RevenueView.vue"),
        meta: { title: "Báo cáo doanh thu" },
      },
    ],
  },
  {
    path: "/staff",
    component: () => import("../components/admin/AdminShell.vue"),
    meta: { requiresAuth: true, roles: ["STAFF", "ADMIN"], adminArea: true },
    children: [
      { path: "", redirect: "/staff/orders" },
      {
        path: "orders",
        name: "staff-orders",
        component: () => import("../views/admin/OrdersView.vue"),
        meta: { title: "Xử lý đơn hàng" },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("../views/NotFoundView.vue"),
    meta: { title: "Không tìm thấy trang" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 };
  },
});
router.beforeEach(async (to) => {
  document.title = `${to.meta.title || "coffeShop"} | coffeShop`;
  const auth = useAuthStore();
  if (
    to.meta.requiresAuth ||
    (localStorage.getItem("accessToken") && !auth.initialized)
  )
    await auth.bootstrap();
  if (to.meta.requiresAuth && !auth.loggedIn)
    return { name: "login", query: { redirect: to.fullPath } };
  if (to.meta.roles && !to.meta.roles.includes(auth.role))
    return { name: "home" };
  return true;
});
export default router;
