// Frontend 5-6: tuong thich cac router Node.js da co trong coffeShop.
import api from "./axios";
const data = (promise) => promise.then((r) => r.data);

// Danh muc
export const adminCategories = () => data(api.get("/categories/admin"));
export const createCategory = (body) => data(api.post("/categories", body));
export const updateCategory = (id, body) =>
  data(api.patch(`/categories/${id}`, body));
export const hideCategory = (id) => data(api.delete(`/categories/${id}`));

// San pham, bien the, nhom tuy chon, hinh anh
export const adminProducts = (params) =>
  data(api.get("/products/admin/list", { params }));
export const adminProduct = (id) => data(api.get(`/products/admin/${id}`));
export const createProduct = (body) => data(api.post("/products", body));
export const updateProduct = (id, body) =>
  data(api.patch(`/products/${id}`, body));
export const hideProduct = (id) => data(api.delete(`/products/${id}`));
export const createVariant = (id, body) =>
  data(api.post(`/products/${id}/variants`, body));
export const updateVariant = (id, body) =>
  data(api.patch(`/products/variants/${id}`, body));
export const hideVariant = (id) => data(api.delete(`/products/variants/${id}`));
export const createOptionGroup = (id, body) =>
  data(api.post(`/products/${id}/option-groups`, body));
export const updateOptionGroup = (id, body) =>
  data(api.patch(`/products/option-groups/${id}`, body));
export const deleteOptionGroup = (id) =>
  data(api.delete(`/products/option-groups/${id}`));
export const createOption = (id, body) =>
  data(api.post(`/products/option-groups/${id}/values`, body));
export const updateOption = (id, body) =>
  data(api.patch(`/products/options/${id}`, body));
export const hideOption = (id) => data(api.delete(`/products/options/${id}`));
export const uploadProductImage = (id, file, primary) => {
  const form = new FormData();
  form.append("image", file);
  form.append("la_anh_chinh", String(primary));
  // Cho trinh duyet tu them multipart boundary; khong thiet lap content-type thu cong.
  return data(
    api.post(`/products/${id}/images`, form, {
      headers: { "Content-Type": undefined },
    }),
  );
};
export const setPrimaryImage = (id) =>
  data(api.patch(`/products/images/${id}/main`));
export const deleteProductImage = (id) =>
  data(api.delete(`/products/images/${id}`));

// Kho
export const adminInventory = (low = false) =>
  data(api.get("/inventory", { params: { low } }));
export const updateInventory = (id, body) =>
  data(api.patch(`/inventory/${id}`, body));

// Ma giam gia
export const adminPromotions = () => data(api.get("/promotions"));
export const createPromotion = (body) => data(api.post("/promotions", body));
export const updatePromotion = (id, body) =>
  data(api.patch(`/promotions/${id}`, body));

// Khu vuc giao hang
export const adminZones = () => data(api.get("/shipping/admin/zones"));
export const createZone = (body) =>
  data(api.post("/shipping/admin/zones", body));
export const updateZone = (id, body) =>
  data(api.patch(`/shipping/admin/zones/${id}`, body));

// Nguoi dung
export const adminUsers = (params) => data(api.get("/users", { params }));
export const adminUser = (id) => data(api.get(`/users/${id}`));
export const setUserStatus = (id, trang_thai) =>
  data(api.patch(`/users/${id}/status`, { trang_thai }));
export const setUserRole = (id, vai_tro) =>
  data(api.patch(`/users/${id}/role`, { vai_tro }));

// Don hang - Admin / STAFF
export const adminOrders = (params) =>
  data(api.get("/orders/admin/list", { params }));
export const adminOrder = (id) => data(api.get(`/orders/admin/${id}`));
export const setOrderStatus = (id, body) =>
  data(api.patch(`/orders/admin/${id}/status`, body));
export const updateOrderShipping = (id, body) =>
  data(api.patch(`/orders/admin/${id}/shipping`, body));
export const cancelAdminOrder = (id) =>
  data(api.post(`/orders/admin/${id}/cancel`));
