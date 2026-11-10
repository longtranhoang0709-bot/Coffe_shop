"use strict";

const pool = require("../config/db");

function fail(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}
function normalIds(value) {
  let arr = value;
  if (value === null || value === undefined) arr = [];
  else if (typeof value === "string") {
    try {
      arr = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr) || arr.length > 20) return null;
  // Ho tro ca du lieu demo cu: [{ma_tuy_chon: 9002, ...}],
  // nhung moi thao tac moi chi luu mang ID: [9002, 9006].
  const ids = arr.map((value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? value.ma_tuy_chon
      : value,
  );
  if (
    !ids.every((id) => Number.isSafeInteger(id) && id > 0) ||
    new Set(ids).size !== ids.length
  )
    return null;
  return ids.sort((a, b) => a - b);
}
function moneyToCents(value) {
  const match = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("Du lieu gia trong CSDL khong hop le.");
  const cents =
    Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents))
    throw new Error("Gia vuot qua gioi han tinh toan.");
  return cents;
}
function toMoney(cents) {
  if (!Number.isSafeInteger(cents))
    throw new Error("Tong tien vuot qua gioi han tinh toan.");
  return cents / 100;
}
function cartEmpty() {
  return {
    ma_gio_hang: null,
    items: [],
    so_dong_hang: 0,
    tong_so_luong: 0,
    tam_tinh: 0,
    co_the_dat_hang: false,
    ghi_chu:
      "Tam tinh chua gom giam gia va phi van chuyen. Gia va kho se duoc kiem tra lai khi dat hang.",
  };
}

async function createGuestCart(guestHash) {
  const [r] = await pool.execute(
    "INSERT INTO GIO_HANG (ma_phien_khach) VALUES (?)",
    [guestHash],
  );
  return r.insertId;
}

async function findCart(executor, owner, lock = false) {
  const byAccount = owner.userId !== null;
  const [rows] = await executor.execute(
    `SELECT ma_gio_hang FROM GIO_HANG WHERE ${byAccount ? "ma_nguoi_dung" : "ma_phien_khach"} = ? LIMIT 1 ${lock ? "FOR UPDATE" : ""}`,
    [byAccount ? owner.userId : owner.guestHash],
  );
  return rows[0]?.ma_gio_hang ?? null;
}

async function ensureLockedCart(conn, owner) {
  if (owner.userId !== null) {
    await conn.execute(
      `INSERT INTO GIO_HANG (ma_nguoi_dung) VALUES (?)
       ON DUPLICATE KEY UPDATE ma_gio_hang = LAST_INSERT_ID(ma_gio_hang)`,
      [owner.userId],
    );
  }
  const id = await findCart(conn, owner, true);
  if (!id)
    throw fail(401, "Ma gio hang khach khong ton tai. Hay tao gio khach moi.");
  return id;
}

async function findVariant(conn, variantId) {
  const [rows] = await conn.execute(
    `SELECT b.ma_bien_the, b.ma_san_pham, b.ten_bien_the, b.gia_ban,
            b.dang_ban AS bien_the_dang_ban, p.dang_ban AS san_pham_dang_ban,
            p.loai_san_pham, c.dang_hoat_dong AS danh_muc_dang_hoat_dong,
            k.so_luong_ton
     FROM BIEN_THE_SAN_PHAM b
     JOIN SAN_PHAM p ON p.ma_san_pham = b.ma_san_pham
     JOIN DANH_MUC c ON c.ma_danh_muc = p.ma_danh_muc
     LEFT JOIN TON_KHO_SAN_PHAM k ON k.ma_bien_the = b.ma_bien_the
     WHERE b.ma_bien_the = ? LIMIT 1`,
    [variantId],
  );
  return rows[0] || null;
}
function ensureAvailable(variant) {
  if (!variant) throw fail(404, "Khong tim thay bien the san pham.");
  if (
    !variant.bien_the_dang_ban ||
    !variant.san_pham_dang_ban ||
    !variant.danh_muc_dang_hoat_dong
  ) {
    throw fail(409, "San pham hien khong con kinh doanh.");
  }
}

async function optionCatalog(conn, productId) {
  const [rows] = await conn.execute(
    `SELECT g.ma_nhom_tuy_chon, g.ten_nhom, g.bat_buoc_chon, g.cho_chon_nhieu,
            v.ma_tuy_chon, v.ten_tuy_chon, v.gia_them, v.dang_ban
     FROM NHOM_TUY_CHON g
     LEFT JOIN GIA_TRI_TUY_CHON v ON v.ma_nhom_tuy_chon = g.ma_nhom_tuy_chon
     WHERE g.ma_san_pham = ? ORDER BY g.ma_nhom_tuy_chon, v.ma_tuy_chon`,
    [productId],
  );
  const groups = new Map();
  const optionLookup = new Map();
  for (const r of rows) {
    if (!groups.has(r.ma_nhom_tuy_chon)) {
      groups.set(r.ma_nhom_tuy_chon, {
        id: r.ma_nhom_tuy_chon,
        name: r.ten_nhom,
        required: Boolean(r.bat_buoc_chon),
        multiple: Boolean(r.cho_chon_nhieu),
      });
    }
    if (r.ma_tuy_chon !== null) {
      optionLookup.set(r.ma_tuy_chon, {
        ma_tuy_chon: r.ma_tuy_chon,
        ma_nhom_tuy_chon: r.ma_nhom_tuy_chon,
        ten_tuy_chon: r.ten_tuy_chon,
        ten_nhom: r.ten_nhom,
        gia_them: r.gia_them,
        dang_ban: Boolean(r.dang_ban),
      });
    }
  }
  return { groups, optionLookup };
}

function validateOptions(catalog, selectedIds) {
  const counts = new Map();
  const selected = [];
  for (const id of selectedIds) {
    const option = catalog.optionLookup.get(id);
    if (!option || !option.dang_ban) {
      throw fail(
        409,
        `Tuy chon ${id} khong ton tai, khong thuoc san pham hoac da ngung ban.`,
      );
    }
    const group = catalog.groups.get(option.ma_nhom_tuy_chon);
    const n = (counts.get(group.id) || 0) + 1;
    if (!group.multiple && n > 1)
      throw fail(400, `Nhom '${group.name}' chi cho chon 1 gia tri.`);
    counts.set(group.id, n);
    selected.push(option);
  }
  for (const group of catalog.groups.values()) {
    if (group.required && !counts.has(group.id)) {
      throw fail(400, `Can chon tuy chon bat buoc: ${group.name}.`);
    }
  }
  return selected;
}

async function getCart(owner) {
  const cartId = await findCart(pool, owner);
  if (!cartId) {
    if (owner.userId === null)
      throw fail(
        401,
        "X-Guest-Token khong hop le hoac gio hang khong ton tai.",
      );
    return cartEmpty();
  }
  const [rows] = await pool.execute(
    `SELECT ct.ma_chi_tiet_gio, ct.ma_gio_hang, ct.ma_bien_the,
            ct.so_luong, ct.tuy_chon_da_chon, ct.ghi_chu,
            b.ma_san_pham, b.ma_sku, b.ten_bien_the, b.kich_co,
            b.khoi_luong_gram, b.gia_ban, b.dang_ban AS bien_the_dang_ban,
            p.ten_san_pham, p.loai_san_pham, p.dang_ban AS san_pham_dang_ban,
            c.dang_hoat_dong AS danh_muc_dang_hoat_dong,
            k.so_luong_ton,
            (SELECT h.duong_dan_anh FROM HINH_ANH_SAN_PHAM h
             WHERE h.ma_san_pham=p.ma_san_pham
             ORDER BY h.la_anh_chinh DESC, h.ma_hinh_anh ASC LIMIT 1) AS hinh_anh
     FROM CHI_TIET_GIO_HANG ct
     JOIN BIEN_THE_SAN_PHAM b ON b.ma_bien_the = ct.ma_bien_the
     JOIN SAN_PHAM p ON p.ma_san_pham = b.ma_san_pham
     JOIN DANH_MUC c ON c.ma_danh_muc = p.ma_danh_muc
     LEFT JOIN TON_KHO_SAN_PHAM k ON k.ma_bien_the = b.ma_bien_the
     WHERE ct.ma_gio_hang=? ORDER BY ct.ma_chi_tiet_gio`,
    [cartId],
  );

  const catalogCache = new Map();
  const stockCounts = new Map();
  for (const row of rows) {
    stockCounts.set(
      row.ma_bien_the,
      (stockCounts.get(row.ma_bien_the) || 0) + row.so_luong,
    );
  }
  let totalCents = 0;
  let totalQty = 0;
  const items = [];
  for (const r of rows) {
    if (!catalogCache.has(r.ma_san_pham)) {
      catalogCache.set(r.ma_san_pham, await optionCatalog(pool, r.ma_san_pham));
    }
    const catalog = catalogCache.get(r.ma_san_pham);
    const ids = normalIds(r.tuy_chon_da_chon);
    const warnings = [];
    let options = [];
    if (
      !r.san_pham_dang_ban ||
      !r.bien_the_dang_ban ||
      !r.danh_muc_dang_hoat_dong
    ) {
      warnings.push("San pham hoac bien the da ngung ban.");
    }
    if (ids === null) warnings.push("Du lieu tuy chon trong gio khong hop le.");
    else {
      try {
        options = validateOptions(catalog, ids);
      } catch (error) {
        if (!error.statusCode) throw error;
        warnings.push(error.message);
        options = ids.map((id) => catalog.optionLookup.get(id)).filter(Boolean);
      }
    }
    if (r.loai_san_pham === "DONG_GOI") {
      const stock = Number(r.so_luong_ton ?? 0);
      if (stockCounts.get(r.ma_bien_the) > stock)
        warnings.push(`Ton kho khong du (con ${stock}).`);
    }
    let optionsCents = 0;
    for (const option of options) optionsCents += moneyToCents(option.gia_them);
    const unitCents = moneyToCents(r.gia_ban);
    const lineCents = (unitCents + optionsCents) * r.so_luong;
    totalCents += lineCents;
    totalQty += r.so_luong;
    items.push({
      ma_chi_tiet_gio: r.ma_chi_tiet_gio,
      ma_bien_the: r.ma_bien_the,
      ma_san_pham: r.ma_san_pham,
      ten_san_pham: r.ten_san_pham,
      ten_bien_the: r.ten_bien_the,
      ma_sku: r.ma_sku,
      loai_san_pham: r.loai_san_pham,
      kich_co: r.kich_co,
      khoi_luong_gram: r.khoi_luong_gram,
      hinh_anh: r.hinh_anh,
      so_luong: r.so_luong,
      ghi_chu: r.ghi_chu,
      tuy_chon_da_chon: options.map((o) => ({
        ma_tuy_chon: o.ma_tuy_chon,
        ten_nhom: o.ten_nhom,
        ten_tuy_chon: o.ten_tuy_chon,
        gia_them: toMoney(moneyToCents(o.gia_them)),
      })),
      don_gia: toMoney(unitCents),
      gia_tuy_chon: toMoney(optionsCents),
      don_gia_sau_tuy_chon: toMoney(unitCents + optionsCents),
      thanh_tien: toMoney(lineCents),
      so_luong_ton:
        r.loai_san_pham === "DONG_GOI" ? Number(r.so_luong_ton ?? 0) : null,
      hop_le: warnings.length === 0,
      loi: warnings,
    });
  }
  return {
    ma_gio_hang: cartId,
    items,
    so_dong_hang: items.length,
    tong_so_luong: totalQty,
    tam_tinh: toMoney(totalCents),
    co_the_dat_hang: items.length > 0 && items.every((item) => item.hop_le),
    ghi_chu:
      "Tam tinh chua gom giam gia va phi giao hang. Backend se tinh lai gia va kho khi dat hang.",
  };
}

async function inTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function assertStock(
  conn,
  cartId,
  variant,
  desiredQty,
  exceptItemId = null,
) {
  if (variant.loai_san_pham !== "DONG_GOI") return;
  const stock = Number(variant.so_luong_ton ?? 0);
  const [rows] = await conn.execute(
    `SELECT COALESCE(SUM(so_luong), 0) AS da_chon
     FROM CHI_TIET_GIO_HANG
     WHERE ma_gio_hang=? AND ma_bien_the=? ${exceptItemId ? "AND ma_chi_tiet_gio<>?" : ""}`,
    exceptItemId
      ? [cartId, variant.ma_bien_the, exceptItemId]
      : [cartId, variant.ma_bien_the],
  );
  if (Number(rows[0].da_chon) + desiredQty > stock) {
    throw fail(
      409,
      `Khong du ton kho. San pham chi con ${stock}, gio da co ${rows[0].da_chon}.`,
    );
  }
}

async function addItem(owner, data) {
  await inTransaction(async (conn) => {
    const cartId = await ensureLockedCart(conn, owner);
    const variant = await findVariant(conn, data.ma_bien_the);
    ensureAvailable(variant);
    const catalog = await optionCatalog(conn, variant.ma_san_pham);
    validateOptions(catalog, data.tuy_chon_da_chon);
    await assertStock(conn, cartId, variant, data.so_luong);
    const [items] = await conn.execute(
      `SELECT ma_chi_tiet_gio, ma_bien_the, so_luong, tuy_chon_da_chon, ghi_chu
       FROM CHI_TIET_GIO_HANG WHERE ma_gio_hang=?`,
      [cartId],
    );
    const equal = items.find(
      (item) =>
        item.ma_bien_the === data.ma_bien_the &&
        JSON.stringify(normalIds(item.tuy_chon_da_chon)) ===
          JSON.stringify(data.tuy_chon_da_chon) &&
        (item.ghi_chu || null) === data.ghi_chu,
    );
    if (equal) {
      const qty = equal.so_luong + data.so_luong;
      if (qty > 99)
        throw fail(409, "Mot dong gio hang khong duoc vuot 99 san pham.");
      await conn.execute(
        "UPDATE CHI_TIET_GIO_HANG SET so_luong=? WHERE ma_chi_tiet_gio=?",
        [qty, equal.ma_chi_tiet_gio],
      );
    } else {
      await conn.execute(
        `INSERT INTO CHI_TIET_GIO_HANG
         (ma_gio_hang, ma_bien_the, so_luong, tuy_chon_da_chon, ghi_chu)
         VALUES (?, ?, ?, ?, ?)`,
        [
          cartId,
          data.ma_bien_the,
          data.so_luong,
          JSON.stringify(data.tuy_chon_da_chon),
          data.ghi_chu,
        ],
      );
    }
    await conn.execute(
      "UPDATE GIO_HANG SET ngay_cap_nhat=CURRENT_TIMESTAMP WHERE ma_gio_hang=?",
      [cartId],
    );
  });
  return getCart(owner);
}

async function updateItem(owner, itemId, changes) {
  await inTransaction(async (conn) => {
    const cartId = await findCart(conn, owner, true);
    if (!cartId) throw fail(404, "Khong tim thay gio hang.");
    const [rows] = await conn.execute(
      "SELECT * FROM CHI_TIET_GIO_HANG WHERE ma_chi_tiet_gio=? AND ma_gio_hang=? LIMIT 1",
      [itemId, cartId],
    );
    const old = rows[0];
    if (!old)
      throw fail(404, "Khong tim thay san pham trong gio hang cua ban.");
    const variant = await findVariant(conn, old.ma_bien_the);
    ensureAvailable(variant);
    const catalog = await optionCatalog(conn, variant.ma_san_pham);
    const selected =
      changes.tuy_chon_da_chon ?? normalIds(old.tuy_chon_da_chon);
    if (!selected)
      throw fail(409, "Tuy chon cu bi loi. Hay chon lai tuy chon.");
    validateOptions(catalog, selected);
    const qty = changes.so_luong ?? old.so_luong;
    await assertStock(conn, cartId, variant, qty, itemId);
    const note = Object.prototype.hasOwnProperty.call(changes, "ghi_chu")
      ? changes.ghi_chu
      : old.ghi_chu;
    await conn.execute(
      `UPDATE CHI_TIET_GIO_HANG
       SET so_luong=?, tuy_chon_da_chon=?, ghi_chu=?
       WHERE ma_chi_tiet_gio=? AND ma_gio_hang=?`,
      [qty, JSON.stringify(selected), note, itemId, cartId],
    );
    await conn.execute(
      "UPDATE GIO_HANG SET ngay_cap_nhat=CURRENT_TIMESTAMP WHERE ma_gio_hang=?",
      [cartId],
    );
  });
  return getCart(owner);
}

async function deleteItem(owner, itemId) {
  await inTransaction(async (conn) => {
    const cartId = await findCart(conn, owner, true);
    if (!cartId) throw fail(404, "Khong tim thay gio hang.");
    const [r] = await conn.execute(
      "DELETE FROM CHI_TIET_GIO_HANG WHERE ma_chi_tiet_gio=? AND ma_gio_hang=?",
      [itemId, cartId],
    );
    if (!r.affectedRows)
      throw fail(404, "Khong tim thay san pham trong gio hang cua ban.");
    await conn.execute(
      "UPDATE GIO_HANG SET ngay_cap_nhat=CURRENT_TIMESTAMP WHERE ma_gio_hang=?",
      [cartId],
    );
  });
  return getCart(owner);
}

async function clearCart(owner) {
  await inTransaction(async (conn) => {
    const cartId = await findCart(conn, owner, true);
    if (!cartId) {
      if (owner.userId === null) throw fail(401, "Ma gio khach khong hop le.");
      return;
    }
    await conn.execute("DELETE FROM CHI_TIET_GIO_HANG WHERE ma_gio_hang=?", [
      cartId,
    ]);
    await conn.execute(
      "UPDATE GIO_HANG SET ngay_cap_nhat=CURRENT_TIMESTAMP WHERE ma_gio_hang=?",
      [cartId],
    );
  });
  return getCart(owner);
}

module.exports = {
  createGuestCart,
  getCart,
  addItem,
  updateItem,
  deleteItem,
  clearCart,
};
