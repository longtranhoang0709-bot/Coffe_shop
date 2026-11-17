export const formatVND = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const productTypeLabel = (type) =>
  type === "DONG_GOI" ? "Cà phê nguyên chất" : "Cà phê pha chế";
