import api, { BACKEND_ORIGIN } from "./axios";

export function getProducts(params = {}) {
  return api.get("/products", { params }).then((r) => r.data);
}
export function getProduct(id) {
  return api.get(`/products/${id}`).then((r) => r.data.product);
}
export function getCategories() {
  return api.get("/categories").then((r) => r.data.categories);
}

export function productImage(path, productType = "DO_UONG") {
  if (typeof path === "string" && path) {
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/")) return `${BACKEND_ORIGIN}${path}`;
  }
  return productType === "DONG_GOI" ? "/images/pack.svg" : "/images/drink.svg";
}
