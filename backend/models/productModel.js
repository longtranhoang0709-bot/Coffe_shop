const pool = require("../config/db");

const productFields = new Set([
  "ma_danh_muc",
  "ten_san_pham",
  "loai_san_pham",
  "mo_ta",
  "dang_ban",
]);
const variantFields = new Set([
  "ma_sku",
  "ten_bien_the",
  "kich_co",
  "khoi_luong_gram",
  "loai_hat",
  "do_xay",
  "gia_ban",
  "dang_ban",
]);
const groupFields = new Set(["ten_nhom", "bat_buoc_chon", "cho_chon_nhieu"]);
const valueFields = new Set(["ten_tuy_chon", "gia_them", "dang_ban"]);

async function updateFields(table, pk, id, changes, allowed) {
  const keys = Object.keys(changes);
  if (!keys.length || keys.some((key) => !allowed.has(key)))
    throw new Error("Invalid update fields");
  const assignments = keys.map((key) => `\`${key}\` = ?`).join(", ");
  const values = keys.map((key) => changes[key]);
  const [result] = await pool.execute(
    `UPDATE \`${table}\` SET ${assignments} WHERE \`${pk}\` = ?`,
    [...values, id],
  );
  return result.affectedRows > 0;
}

async function listProducts({
  page,
  limit,
  search,
  categoryId,
  type,
  minPrice,
  maxPrice,
  sort,
  isAdmin,
}) {
  const where = [];
  const args = [];
  if (!isAdmin) {
    where.push("p.dang_ban = 1", "c.dang_hoat_dong = 1");
    where.push(
      "EXISTS (SELECT 1 FROM BIEN_THE_SAN_PHAM b0 WHERE b0.ma_san_pham=p.ma_san_pham AND b0.dang_ban=1)",
    );
  }
  if (categoryId) {
    where.push("p.ma_danh_muc = ?");
    args.push(categoryId);
  }
  if (type) {
    where.push("p.loai_san_pham = ?");
    args.push(type);
  }
  if (search) {
    where.push("(p.ten_san_pham LIKE ? OR p.mo_ta LIKE ?)");
    args.push(`%${search}%`, `%${search}%`);
  }
  if (minPrice !== null || maxPrice !== null) {
    const conditions = [
      "bprice.ma_san_pham=p.ma_san_pham",
      "bprice.dang_ban=1",
    ];
    if (minPrice !== null) {
      conditions.push("bprice.gia_ban >= ?");
      args.push(minPrice);
    }
    if (maxPrice !== null) {
      conditions.push("bprice.gia_ban <= ?");
      args.push(maxPrice);
    }
    where.push(
      `EXISTS (SELECT 1 FROM BIEN_THE_SAN_PHAM bprice WHERE ${conditions.join(" AND ")})`,
    );
  }
  const condition = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [totals] = await pool.execute(
    `SELECT COUNT(*) AS total FROM SAN_PHAM p
     JOIN DANH_MUC c ON c.ma_danh_muc = p.ma_danh_muc ${condition}`,
    args,
  );
  const order =
    sort === "gia_tang"
      ? "ORDER BY (gia_tu IS NULL) ASC, gia_tu ASC, p.ma_san_pham DESC"
      : sort === "gia_giam"
        ? "ORDER BY (gia_tu IS NULL) ASC, gia_tu DESC, p.ma_san_pham DESC"
        : "ORDER BY p.ma_san_pham DESC";
  const sql = `
    SELECT p.ma_san_pham, p.ma_danh_muc, c.ten_danh_muc,
           p.ten_san_pham, p.loai_san_pham, p.mo_ta, p.dang_ban, p.ngay_tao,
           (SELECT h.duong_dan_anh FROM HINH_ANH_SAN_PHAM h
            WHERE h.ma_san_pham = p.ma_san_pham
            ORDER BY h.la_anh_chinh DESC, h.ma_hinh_anh ASC LIMIT 1) AS hinh_anh,
           (SELECT MIN(b.gia_ban) FROM BIEN_THE_SAN_PHAM b
            WHERE b.ma_san_pham=p.ma_san_pham AND b.dang_ban=1) AS gia_tu,
           (SELECT MAX(b.gia_ban) FROM BIEN_THE_SAN_PHAM b
            WHERE b.ma_san_pham=p.ma_san_pham AND b.dang_ban=1) AS gia_den
    FROM SAN_PHAM p JOIN DANH_MUC c ON c.ma_danh_muc = p.ma_danh_muc
    ${condition}
    ${order}
    LIMIT ? OFFSET ?`;
  const [rows] = await pool.execute(sql, [...args, limit, (page - 1) * limit]);
  return {
    page,
    limit,
    total: totals[0].total,
    totalPages: Math.ceil(totals[0].total / limit),
    products: rows,
  };
}

async function getProductBase(productId) {
  const [rows] = await pool.execute(
    `SELECT p.*, c.ten_danh_muc, c.dang_hoat_dong AS danh_muc_dang_hoat_dong
     FROM SAN_PHAM p JOIN DANH_MUC c ON c.ma_danh_muc=p.ma_danh_muc
     WHERE p.ma_san_pham=? LIMIT 1`,
    [productId],
  );
  return rows[0] || null;
}

async function getProductDetail(productId, isAdmin = false) {
  const product = await getProductBase(productId);
  if (
    !product ||
    (!isAdmin && (!product.dang_ban || !product.danh_muc_dang_hoat_dong))
  )
    return null;
  const [variants] = await pool.execute(
    `SELECT b.*, t.so_luong_ton, t.muc_ton_toi_thieu
     FROM BIEN_THE_SAN_PHAM b
     LEFT JOIN TON_KHO_SAN_PHAM t ON t.ma_bien_the=b.ma_bien_the
     WHERE b.ma_san_pham=? ${isAdmin ? "" : "AND b.dang_ban=1"}
     ORDER BY b.ma_bien_the`,
    [productId],
  );
  if (!isAdmin && variants.length === 0) return null;
  const [images] = await pool.execute(
    `SELECT ma_hinh_anh, duong_dan_anh, la_anh_chinh FROM HINH_ANH_SAN_PHAM
     WHERE ma_san_pham=? ORDER BY la_anh_chinh DESC, ma_hinh_anh`,
    [productId],
  );
  const [groups] = await pool.execute(
    `SELECT ma_nhom_tuy_chon, ma_san_pham, ten_nhom, bat_buoc_chon, cho_chon_nhieu
     FROM NHOM_TUY_CHON WHERE ma_san_pham=? ORDER BY ma_nhom_tuy_chon`,
    [productId],
  );
  const [values] = await pool.execute(
    `SELECT v.* FROM GIA_TRI_TUY_CHON v
     JOIN NHOM_TUY_CHON g ON g.ma_nhom_tuy_chon=v.ma_nhom_tuy_chon
     WHERE g.ma_san_pham=? ${isAdmin ? "" : "AND v.dang_ban=1"}
     ORDER BY v.ma_tuy_chon`,
    [productId],
  );
  const options = groups
    .map((g) => ({
      ...g,
      gia_tri: values.filter((v) => v.ma_nhom_tuy_chon === g.ma_nhom_tuy_chon),
    }))
    .filter((g) => isAdmin || g.gia_tri.length > 0);
  return {
    ...product,
    bien_the: variants,
    hinh_anh: images,
    nhom_tuy_chon: options,
  };
}

async function createProduct(data) {
  const [r] = await pool.execute(
    `INSERT INTO SAN_PHAM (ma_danh_muc, ten_san_pham, loai_san_pham, mo_ta, dang_ban)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.ma_danh_muc,
      data.ten_san_pham,
      data.loai_san_pham,
      data.mo_ta ?? null,
      data.dang_ban ? 1 : 0,
    ],
  );
  return getProductDetail(r.insertId, true);
}

async function updateProduct(productId, data) {
  await updateFields("SAN_PHAM", "ma_san_pham", productId, data, productFields);
  return getProductDetail(productId, true);
}

async function disableProduct(productId) {
  const [r] = await pool.execute(
    "UPDATE SAN_PHAM SET dang_ban=0 WHERE ma_san_pham=?",
    [productId],
  );
  return r.affectedRows > 0;
}

async function hasVariants(productId) {
  const [rows] = await pool.execute(
    "SELECT 1 FROM BIEN_THE_SAN_PHAM WHERE ma_san_pham=? LIMIT 1",
    [productId],
  );
  return rows.length > 0;
}

async function getVariant(variantId) {
  const [rows] = await pool.execute(
    `SELECT b.*, p.loai_san_pham, t.so_luong_ton, t.muc_ton_toi_thieu
     FROM BIEN_THE_SAN_PHAM b
     JOIN SAN_PHAM p ON p.ma_san_pham = b.ma_san_pham
     LEFT JOIN TON_KHO_SAN_PHAM t ON t.ma_bien_the=b.ma_bien_the
     WHERE b.ma_bien_the=? LIMIT 1`,
    [variantId],
  );
  return rows[0] || null;
}

async function createVariant(productId, data, type) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.execute(
      `INSERT INTO BIEN_THE_SAN_PHAM
       (ma_san_pham, ma_sku, ten_bien_the, kich_co, khoi_luong_gram, loai_hat, do_xay, gia_ban, dang_ban)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        data.ma_sku,
        data.ten_bien_the,
        data.kich_co ?? null,
        data.khoi_luong_gram ?? null,
        data.loai_hat ?? null,
        data.do_xay ?? null,
        data.gia_ban,
        data.dang_ban ? 1 : 0,
      ],
    );
    // Nhung san pham dong goi moi can ban ghi ton kho; so luong ban dau = 0.
    if (type === "DONG_GOI") {
      await conn.execute(
        `INSERT INTO TON_KHO_SAN_PHAM (ma_bien_the, so_luong_ton, muc_ton_toi_thieu)
         VALUES (?, 0, 0)`,
        [r.insertId],
      );
    }
    await conn.commit();
    return getVariant(r.insertId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function updateVariant(variantId, data) {
  await updateFields(
    "BIEN_THE_SAN_PHAM",
    "ma_bien_the",
    variantId,
    data,
    variantFields,
  );
  return getVariant(variantId);
}

async function disableVariant(variantId) {
  const [r] = await pool.execute(
    "UPDATE BIEN_THE_SAN_PHAM SET dang_ban=0 WHERE ma_bien_the=?",
    [variantId],
  );
  return r.affectedRows > 0;
}

async function getGroup(groupId) {
  const [rows] = await pool.execute(
    "SELECT * FROM NHOM_TUY_CHON WHERE ma_nhom_tuy_chon=? LIMIT 1",
    [groupId],
  );
  return rows[0] || null;
}
async function createGroup(productId, data) {
  const [r] = await pool.execute(
    `INSERT INTO NHOM_TUY_CHON (ma_san_pham, ten_nhom, bat_buoc_chon, cho_chon_nhieu)
     VALUES (?, ?, ?, ?)`,
    [
      productId,
      data.ten_nhom,
      data.bat_buoc_chon ? 1 : 0,
      data.cho_chon_nhieu ? 1 : 0,
    ],
  );
  return getGroup(r.insertId);
}
async function updateGroup(groupId, data) {
  await updateFields(
    "NHOM_TUY_CHON",
    "ma_nhom_tuy_chon",
    groupId,
    data,
    groupFields,
  );
  return getGroup(groupId);
}
async function deleteEmptyGroup(groupId) {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS n FROM GIA_TRI_TUY_CHON WHERE ma_nhom_tuy_chon=?",
    [groupId],
  );
  if (rows[0].n > 0) return false;
  const [r] = await pool.execute(
    "DELETE FROM NHOM_TUY_CHON WHERE ma_nhom_tuy_chon=?",
    [groupId],
  );
  return r.affectedRows > 0;
}

async function getOption(optionId) {
  const [rows] = await pool.execute(
    "SELECT * FROM GIA_TRI_TUY_CHON WHERE ma_tuy_chon=? LIMIT 1",
    [optionId],
  );
  return rows[0] || null;
}
async function createOption(groupId, data) {
  const [r] = await pool.execute(
    "INSERT INTO GIA_TRI_TUY_CHON (ma_nhom_tuy_chon, ten_tuy_chon, gia_them, dang_ban) VALUES (?, ?, ?, ?)",
    [groupId, data.ten_tuy_chon, data.gia_them ?? 0, data.dang_ban ? 1 : 0],
  );
  return getOption(r.insertId);
}
async function updateOption(optionId, data) {
  await updateFields(
    "GIA_TRI_TUY_CHON",
    "ma_tuy_chon",
    optionId,
    data,
    valueFields,
  );
  return getOption(optionId);
}
async function disableOption(optionId) {
  const [r] = await pool.execute(
    "UPDATE GIA_TRI_TUY_CHON SET dang_ban=0 WHERE ma_tuy_chon=?",
    [optionId],
  );
  return r.affectedRows > 0;
}

async function getImage(imageId) {
  const [rows] = await pool.execute(
    "SELECT * FROM HINH_ANH_SAN_PHAM WHERE ma_hinh_anh=? LIMIT 1",
    [imageId],
  );
  return rows[0] || null;
}
async function addImage(productId, imagePath, requestedPrimary) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [parent] = await conn.execute(
      "SELECT ma_san_pham FROM SAN_PHAM WHERE ma_san_pham=? FOR UPDATE",
      [productId],
    );
    if (!parent.length) {
      await conn.rollback();
      return null;
    }
    const [rows] = await conn.execute(
      "SELECT ma_hinh_anh FROM HINH_ANH_SAN_PHAM WHERE ma_san_pham=? AND la_anh_chinh=1 LIMIT 1",
      [productId],
    );
    const makePrimary = requestedPrimary || rows.length === 0;
    if (makePrimary)
      await conn.execute(
        "UPDATE HINH_ANH_SAN_PHAM SET la_anh_chinh=0 WHERE ma_san_pham=?",
        [productId],
      );
    const [r] = await conn.execute(
      "INSERT INTO HINH_ANH_SAN_PHAM (ma_san_pham, duong_dan_anh, la_anh_chinh) VALUES (?, ?, ?)",
      [productId, imagePath, makePrimary ? 1 : 0],
    );
    await conn.commit();
    return getImage(r.insertId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
async function setPrimaryImage(imageId) {
  const image = await getImage(imageId);
  if (!image) return null;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      "SELECT ma_san_pham FROM SAN_PHAM WHERE ma_san_pham=? FOR UPDATE",
      [image.ma_san_pham],
    );
    const [rows] = await conn.execute(
      "SELECT ma_hinh_anh FROM HINH_ANH_SAN_PHAM WHERE ma_hinh_anh=? AND ma_san_pham=?",
      [imageId, image.ma_san_pham],
    );
    if (!rows.length) {
      await conn.rollback();
      return null;
    }
    await conn.execute(
      "UPDATE HINH_ANH_SAN_PHAM SET la_anh_chinh=0 WHERE ma_san_pham=?",
      [image.ma_san_pham],
    );
    await conn.execute(
      "UPDATE HINH_ANH_SAN_PHAM SET la_anh_chinh=1 WHERE ma_hinh_anh=?",
      [imageId],
    );
    await conn.commit();
    return getImage(imageId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
async function deleteImage(imageId) {
  const image = await getImage(imageId);
  if (!image) return null;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      "SELECT ma_san_pham FROM SAN_PHAM WHERE ma_san_pham=? FOR UPDATE",
      [image.ma_san_pham],
    );
    const [rows] = await conn.execute(
      "SELECT * FROM HINH_ANH_SAN_PHAM WHERE ma_hinh_anh=? AND ma_san_pham=? LIMIT 1",
      [imageId, image.ma_san_pham],
    );
    if (!rows.length) {
      await conn.rollback();
      return null;
    }
    const current = rows[0];
    await conn.execute("DELETE FROM HINH_ANH_SAN_PHAM WHERE ma_hinh_anh=?", [
      imageId,
    ]);
    if (current.la_anh_chinh) {
      const [other] = await conn.execute(
        "SELECT ma_hinh_anh FROM HINH_ANH_SAN_PHAM WHERE ma_san_pham=? ORDER BY ma_hinh_anh ASC LIMIT 1",
        [image.ma_san_pham],
      );
      if (other.length)
        await conn.execute(
          "UPDATE HINH_ANH_SAN_PHAM SET la_anh_chinh=1 WHERE ma_hinh_anh=?",
          [other[0].ma_hinh_anh],
        );
    }
    await conn.commit();
    return current;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  listProducts,
  getProductBase,
  getProductDetail,
  createProduct,
  updateProduct,
  disableProduct,
  hasVariants,
  getVariant,
  createVariant,
  updateVariant,
  disableVariant,
  getGroup,
  createGroup,
  updateGroup,
  deleteEmptyGroup,
  getOption,
  createOption,
  updateOption,
  disableOption,
  getImage,
  addImage,
  setPrimaryImage,
  deleteImage,
};
