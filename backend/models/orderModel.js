"use strict";
// Module 5: MySQL / mysql2, dung dung 19 bang cua coffe_demo.
const pool = require("../config/db");
const { randomBytes } = require("node:crypto");

const S = Object.freeze({
  PENDING: "CHO_XAC_NHAN",
  CONFIRMED: "DA_XAC_NHAN",
  PREPARING: "DANG_CHUAN_BI",
  READY: "CHO_NHAN",
  SHIPPING: "DANG_GIAO",
  DONE: "HOAN_THANH",
  CANCELLED: "DA_HUY",
});
const SHIPPING = "GIAO_TAN_NOI";
const PICKUP = new Set(["MANG_DI", "TAI_QUAN"]);
const METHODS = new Set(["COD", "TIEN_MAT", "VNPAY"]);
const PACKED = "DONG_GOI";
const MAX_MONEY_CENTS = 999999999999; // DECIMAL(12,2)

function fail(status, message) {
  return Object.assign(new Error(message), { statusCode: status });
}
function positiveInt(value) {
  return Number.isSafeInteger(value) && value > 0;
}
function cents(value) {
  const m = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) throw fail(500, "Gia tri tien trong database khong hop le.");
  const n = Number(m[1]) * 100 + Number((m[2] || "").padEnd(2, "0"));
  if (!Number.isSafeInteger(n)) throw fail(500, "Gia tri tien vuot gioi han.");
  return n;
}
function money(n) {
  if (!Number.isSafeInteger(n) || n < 0 || n > MAX_MONEY_CENTS) {
    throw fail(400, "So tien vuot gioi han he thong.");
  }
  return (n / 100).toFixed(2);
}
function optionsToIds(value) {
  let arr = value;
  if (value == null) arr = [];
  if (typeof arr === "string") {
    try {
      arr = JSON.parse(arr);
    } catch {
      throw fail(409, "Du lieu tuy chon gio hang khong hop le.");
    }
  }
  if (!Array.isArray(arr) || arr.length > 20)
    throw fail(409, "Du lieu tuy chon gio hang khong hop le.");
  const ids = arr.map((v) => (v && typeof v === "object" ? v.ma_tuy_chon : v));
  if (!ids.every(positiveInt) || new Set(ids).size !== ids.length) {
    throw fail(409, "Tuy chon gio hang khong hop le.");
  }
  return [...ids].sort((a, b) => a - b);
}
function normalizeText(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi");
}

async function cartForOwner(conn, owner, lock) {
  const column = owner.userId ? "ma_nguoi_dung" : "ma_phien_khach";
  const id = owner.userId || owner.guestHash;
  const [rows] = await conn.execute(
    `SELECT ma_gio_hang FROM GIO_HANG WHERE ${column} = ? ${lock ? "FOR UPDATE" : ""}`,
    [id],
  );
  if (!rows.length)
    throw fail(400, "Gio hang khong ton tai. Hay them san pham truoc.");
  return rows[0].ma_gio_hang;
}
async function cartLines(conn, cartId, lock) {
  const [rows] = await conn.execute(
    `SELECT ma_chi_tiet_gio, ma_bien_the, so_luong, tuy_chon_da_chon, ghi_chu
     FROM CHI_TIET_GIO_HANG WHERE ma_gio_hang=? ORDER BY ma_chi_tiet_gio
     ${lock ? "FOR UPDATE" : ""}`,
    [cartId],
  );
  if (!rows.length) throw fail(400, "Gio hang trong.");
  if (rows.length > 60) throw fail(400, "Gio hang toi da 60 dong san pham.");
  return rows;
}
async function loadVariants(conn, lines, lock) {
  const ids = [...new Set(lines.map((x) => x.ma_bien_the))].sort(
    (a, b) => a - b,
  );
  const qs = ids.map(() => "?").join(",");
  const [rows] = await conn.query(
    `SELECT b.ma_bien_the,b.ma_san_pham,b.ten_bien_the,b.gia_ban,
            b.dang_ban AS bien_the_dang_ban, p.ten_san_pham, p.loai_san_pham,
            p.dang_ban AS san_pham_dang_ban,c.dang_hoat_dong
       FROM BIEN_THE_SAN_PHAM b
       JOIN SAN_PHAM p ON p.ma_san_pham=b.ma_san_pham
       JOIN DANH_MUC c ON c.ma_danh_muc=p.ma_danh_muc
       WHERE b.ma_bien_the IN (${qs}) ORDER BY b.ma_bien_the ${lock ? "FOR UPDATE" : ""}`,
    ids,
  );
  const found = new Map(rows.map((r) => [r.ma_bien_the, r]));
  if (found.size !== ids.length)
    throw fail(409, "Gio co san pham khong con ton tai.");
  return found;
}
async function getOptions(conn, productId, cache) {
  if (cache.has(productId)) return cache.get(productId);
  const [rows] = await conn.execute(
    `SELECT g.ma_nhom_tuy_chon,g.ten_nhom,g.bat_buoc_chon,g.cho_chon_nhieu,
            v.ma_tuy_chon,v.ten_tuy_chon,v.gia_them,v.dang_ban
       FROM NHOM_TUY_CHON g LEFT JOIN GIA_TRI_TUY_CHON v
       ON v.ma_nhom_tuy_chon=g.ma_nhom_tuy_chon
       WHERE g.ma_san_pham=? ORDER BY g.ma_nhom_tuy_chon,v.ma_tuy_chon`,
    [productId],
  );
  const groups = new Map();
  const values = new Map();
  for (const r of rows) {
    if (!groups.has(r.ma_nhom_tuy_chon))
      groups.set(r.ma_nhom_tuy_chon, {
        name: r.ten_nhom,
        required: !!r.bat_buoc_chon,
        multiple: !!r.cho_chon_nhieu,
      });
    if (r.ma_tuy_chon !== null) values.set(r.ma_tuy_chon, r);
  }
  const result = { groups, values };
  cache.set(productId, result);
  return result;
}
function checkedOptions(catalog, ids) {
  const count = new Map();
  const snapshots = [];
  let extra = 0;
  for (const id of ids) {
    const row = catalog.values.get(id);
    if (!row || !row.dang_ban)
      throw fail(409, `Tuy chon ${id} khong thuoc san pham hoac da ngung ban.`);
    const g = catalog.groups.get(row.ma_nhom_tuy_chon);
    const n = (count.get(row.ma_nhom_tuy_chon) || 0) + 1;
    if (!g.multiple && n > 1)
      throw fail(409, `Nhom ${g.name} chi duoc chon mot gia tri.`);
    count.set(row.ma_nhom_tuy_chon, n);
    const add = cents(row.gia_them);
    extra += add;
    snapshots.push({
      ma_tuy_chon: id,
      ten_nhom: g.name,
      ten_tuy_chon: row.ten_tuy_chon,
      gia_them: money(add),
    });
  }
  for (const [key, g] of catalog.groups) {
    if (g.required && !count.has(key))
      throw fail(409, `Chua chon nhom bat buoc: ${g.name}.`);
  }
  return { snapshots, extra };
}
async function calculateCart(conn, owner, lock) {
  const cartId = await cartForOwner(conn, owner, lock);
  const rows = await cartLines(conn, cartId, lock);
  const variants = await loadVariants(conn, rows, lock);
  const cache = new Map();
  const itemList = [];
  const quantities = new Map();
  let subtotal = 0;
  let containsDrink = false;
  let containsPacked = false;
  for (const row of rows) {
    if (!positiveInt(row.so_luong) || row.so_luong > 99)
      throw fail(409, "So luong trong gio khong hop le.");
    const variant = variants.get(row.ma_bien_the);
    if (
      !variant.bien_the_dang_ban ||
      !variant.san_pham_dang_ban ||
      !variant.dang_hoat_dong
    ) {
      throw fail(409, `San pham ${variant.ten_san_pham} da ngung ban.`);
    }
    if (!["DO_UONG", PACKED].includes(variant.loai_san_pham))
      throw fail(409, "Loai san pham khong duoc ho tro.");
    containsDrink ||= variant.loai_san_pham === "DO_UONG";
    containsPacked ||= variant.loai_san_pham === PACKED;
    const ids = optionsToIds(row.tuy_chon_da_chon);
    const catalog = await getOptions(conn, variant.ma_san_pham, cache);
    const { snapshots, extra } = checkedOptions(catalog, ids);
    const base = cents(variant.gia_ban);
    const lineTotal = (base + extra) * row.so_luong;
    if (!Number.isSafeInteger(lineTotal))
      throw fail(409, "Thanh tien qua lon.");
    subtotal += lineTotal;
    if (subtotal > MAX_MONEY_CENTS)
      throw fail(400, "Tong tam tinh vuot gioi han.");
    quantities.set(
      row.ma_bien_the,
      (quantities.get(row.ma_bien_the) || 0) + row.so_luong,
    );
    itemList.push({
      ma_bien_the: row.ma_bien_the,
      product_type: variant.loai_san_pham,
      ten_san_pham_luu: variant.ten_san_pham,
      ten_bien_the_luu: variant.ten_bien_the,
      so_luong: row.so_luong,
      don_gia: money(base),
      gia_tuy_chon: money(extra),
      thanh_tien: money(lineTotal),
      tuy_chon_da_chon: snapshots,
    });
  }
  return {
    cartId,
    items: itemList,
    quantities,
    subtotal,
    containsDrink,
    containsPacked,
  };
}
async function stockCheck(conn, calc, lock) {
  const packaged = calc.items
    .filter((i) => i.product_type === PACKED)
    .map((i) => i.ma_bien_the);
  const ids = [...new Set(packaged)].sort((a, b) => a - b);
  if (!ids.length) return;
  const qs = ids.map(() => "?").join(",");
  const [stock] = await conn.query(
    `SELECT ma_bien_the,so_luong_ton FROM TON_KHO_SAN_PHAM
     WHERE ma_bien_the IN (${qs}) ORDER BY ma_bien_the ${lock ? "FOR UPDATE" : ""}`,
    ids,
  );
  const stocks = new Map(
    stock.map((r) => [r.ma_bien_the, Number(r.so_luong_ton)]),
  );
  for (const id of ids) {
    const need = calc.quantities.get(id);
    const available = stocks.get(id) ?? 0;
    if (need > available)
      throw fail(
        409,
        `Bien the ${id} con ${available} san pham, gio dang yeu cau ${need}.`,
      );
  }
}
async function priceCoupon(conn, code, subtotal, lock) {
  if (!code) return { id: null, discount: 0, code: null };
  const [rows] = await conn.execute(
    `SELECT * FROM MA_GIAM_GIA WHERE ma_code=? LIMIT 1 ${lock ? "FOR UPDATE" : ""}`,
    [code],
  );
  const row = rows[0];
  if (!row || !row.dang_ap_dung)
    throw fail(409, "Ma giam gia khong ton tai hoac da ngung ap dung.");
  const now = Date.now();
  if (
    now < new Date(row.ngay_bat_dau).getTime() ||
    now > new Date(row.ngay_ket_thuc).getTime()
  ) {
    throw fail(409, "Ma giam gia chua den han hoac da het han.");
  }
  if (
    row.gioi_han_su_dung !== null &&
    Number(row.so_lan_da_dung) >= Number(row.gioi_han_su_dung)
  ) {
    throw fail(409, "Ma giam gia da het luot su dung.");
  }
  if (row.don_toi_thieu !== null && subtotal < cents(row.don_toi_thieu))
    throw fail(409, "Don chua dat gia tri toi thieu cho ma giam gia.");
  let discount = 0;
  if (row.loai_giam === "SO_TIEN") discount = cents(row.gia_tri_giam);
  else if (row.loai_giam === "PHAN_TRAM") {
    const rate = cents(row.gia_tri_giam); // 10% -> 1000 (hai so thap phan)
    if (rate <= 0 || rate > 10000)
      throw fail(409, "Ty le giam gia khong hop le.");
    discount = Number((BigInt(subtotal) * BigInt(rate) + 5000n) / 10000n);
  } else throw fail(409, "Loai ma giam gia khong duoc ho tro.");
  if (row.giam_toi_da !== null)
    discount = Math.min(discount, cents(row.giam_toi_da));
  return {
    id: row.ma_giam_gia,
    code: row.ma_code,
    discount: Math.min(discount, subtotal),
  };
}
async function deliveryFee(conn, data, calc) {
  if (data.hinh_thuc_nhan !== SHIPPING) {
    if (data.ma_khu_vuc != null)
      throw fail(400, "Don tai quan/mang di khong can ma_khu_vuc.");
    return { id: null, fee: 0 };
  }
  if (!positiveInt(data.ma_khu_vuc))
    throw fail(400, "Don giao tan noi can ma_khu_vuc.");
  const [rows] = await conn.execute(
    `SELECT * FROM KHU_VUC_GIAO_HANG WHERE ma_khu_vuc=? AND dang_ap_dung=1`,
    [data.ma_khu_vuc],
  );
  const zone = rows[0];
  if (!zone) throw fail(409, "Khu vuc giao hang khong hoat dong.");
  if (calc.containsDrink && !zone.cho_giao_do_uong)
    throw fail(409, "Khu vuc nay khong giao do uong pha che. Hay tach don.");
  if (calc.containsPacked && !zone.cho_giao_dong_goi)
    throw fail(409, "Khu vuc nay khong giao ca phe dong goi. Hay tach don.");
  if (!data.tinh_thanh || !data.phuong_xa)
    throw fail(400, "Can tinh_thanh va phuong_xa khi giao hang.");
  if (
    normalizeText(zone.tinh_thanh) !== normalizeText(data.tinh_thanh) ||
    normalizeText(zone.phuong_xa) !== normalizeText(data.phuong_xa)
  ) {
    throw fail(
      409,
      "Tinh/thanh hoac phuong/xa khong khop khu vuc giao hang da chon.",
    );
  }
  return {
    id: zone.ma_khu_vuc,
    fee: cents(zone.phi_giao_hang),
    ten_khu_vuc: zone.ten_khu_vuc,
  };
}
async function resolveAddress(conn, owner, data) {
  if (data.hinh_thuc_nhan !== SHIPPING)
    return { tinh_thanh: null, phuong_xa: null, dia_chi_giao_hang: null };
  if (data.ma_dia_chi != null) {
    if (!owner.userId)
      throw fail(403, "Khach vang lai khong duoc dung dia chi cua tai khoan.");
    const [rows] = await conn.execute(
      `SELECT tinh_thanh,phuong_xa,dia_chi_chi_tiet,ten_nguoi_nhan,sdt_nguoi_nhan
       FROM DIA_CHI_NGUOI_DUNG WHERE ma_dia_chi=? AND ma_nguoi_dung=?`,
      [data.ma_dia_chi, owner.userId],
    );
    if (!rows.length) throw fail(404, "Khong tim thay dia chi cua ban.");
    return {
      tinh_thanh: rows[0].tinh_thanh,
      phuong_xa: rows[0].phuong_xa,
      dia_chi_giao_hang: rows[0].dia_chi_chi_tiet,
      ten_nguoi_nhan: rows[0].ten_nguoi_nhan,
      sdt_nguoi_nhan: rows[0].sdt_nguoi_nhan,
    };
  }
  if (!data.dia_chi_giao_hang || !data.tinh_thanh || !data.phuong_xa) {
    throw fail(
      400,
      "Dia chi giao hang can tinh_thanh, phuong_xa va dia_chi_giao_hang.",
    );
  }
  return {
    tinh_thanh: data.tinh_thanh,
    phuong_xa: data.phuong_xa,
    dia_chi_giao_hang: data.dia_chi_giao_hang,
  };
}
async function calculate(conn, owner, data, lock) {
  const calc = await calculateCart(conn, owner, lock);
  const address = await resolveAddress(conn, owner, data);
  const fullAddress = { ...data, ...address };
  await stockCheck(conn, calc, lock);
  const zone = await deliveryFee(conn, fullAddress, calc);
  const coupon = await priceCoupon(
    conn,
    data.ma_code || null,
    calc.subtotal,
    lock,
  );
  const total = calc.subtotal - coupon.discount + zone.fee;
  money(total);
  return { calc, address, zone, coupon, total, fullAddress };
}
function publicQuote(result) {
  return {
    items: result.calc.items,
    tam_tinh: money(result.calc.subtotal),
    tien_giam: money(result.coupon.discount),
    phi_giao: money(result.zone.fee),
    tong_tien: money(result.total),
    ma_code: result.coupon.code,
    khu_vuc: result.zone.ten_khu_vuc || null,
    thong_bao: "Gia va ton kho duoc kiem tra lai khi xac nhan dat hang.",
  };
}
async function preview(owner, data) {
  const result = await calculate(pool, owner, data, false);
  return publicQuote(result);
}
async function create(owner, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const computed = await calculate(conn, owner, data, true);
    const { calc, coupon, zone, total, fullAddress } = computed;
    // Ton kho duoc tru trong giao dich duy nhat; loi giua chung se rollback toan bo.
    for (const [variantId, qty] of [...calc.quantities.entries()].sort(
      (a, b) => a[0] - b[0],
    )) {
      if (
        !calc.items.some(
          (i) => i.ma_bien_the === variantId && i.product_type === PACKED,
        )
      )
        continue;
      const [out] = await conn.execute(
        `UPDATE TON_KHO_SAN_PHAM SET so_luong_ton=so_luong_ton-?, ngay_cap_nhat=NOW()
         WHERE ma_bien_the=? AND so_luong_ton>=?`,
        [qty, variantId, qty],
      );
      if (out.affectedRows !== 1)
        throw fail(
          409,
          `Ton kho bien the ${variantId} vua thay doi. Vui long kiem tra lai gio hang.`,
        );
    }
    if (coupon.id) {
      const [out] = await conn.execute(
        `UPDATE MA_GIAM_GIA SET so_lan_da_dung=so_lan_da_dung+1
         WHERE ma_giam_gia=? AND (gioi_han_su_dung IS NULL OR so_lan_da_dung < gioi_han_su_dung)`,
        [coupon.id],
      );
      if (out.affectedRows !== 1) throw fail(409, "Ma giam gia vua het luot.");
    }
    const code = `CS${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(10).toString("hex").toUpperCase()}`;
    const [result] = await conn.execute(
      `INSERT INTO DON_HANG
        (ma_don,ma_nguoi_dung,ma_khu_vuc,ma_giam_gia,hinh_thuc_nhan,
         ten_nguoi_nhan,sdt_nguoi_nhan,tinh_thanh,phuong_xa,dia_chi_giao_hang,
         thoi_gian_nhan,tam_tinh,tien_giam,phi_giao,tong_tien,trang_thai_don,ghi_chu)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        code,
        owner.userId || null,
        zone.id,
        coupon.id,
        data.hinh_thuc_nhan,
        data.ten_nguoi_nhan || fullAddress.ten_nguoi_nhan,
        data.sdt_nguoi_nhan || fullAddress.sdt_nguoi_nhan,
        fullAddress.tinh_thanh || null,
        fullAddress.phuong_xa || null,
        fullAddress.dia_chi_giao_hang || null,
        data.thoi_gian_nhan || null,
        money(calc.subtotal),
        money(coupon.discount),
        money(zone.fee),
        money(total),
        S.PENDING,
        data.ghi_chu || null,
      ],
    );
    const orderId = result.insertId;
    for (const item of calc.items) {
      await conn.execute(
        `INSERT INTO CHI_TIET_DON_HANG
         (ma_don_hang,ma_bien_the,ten_san_pham_luu,ten_bien_the_luu,so_luong,
          don_gia,gia_tuy_chon,thanh_tien,tuy_chon_da_chon)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          orderId,
          item.ma_bien_the,
          item.ten_san_pham_luu,
          item.ten_bien_the_luu,
          item.so_luong,
          item.don_gia,
          item.gia_tuy_chon,
          item.thanh_tien,
          JSON.stringify(item.tuy_chon_da_chon),
        ],
      );
    }
    await conn.execute(
      `INSERT INTO THANH_TOAN
       (ma_don_hang,phuong_thuc,trang_thai_thanh_toan,so_tien)
       VALUES (?,?,?,?)`,
      [orderId, data.phuong_thuc, "CHUA_THANH_TOAN", money(total)],
    );
    if (data.hinh_thuc_nhan === SHIPPING) {
      await conn.execute(
        `INSERT INTO VAN_CHUYEN (ma_don_hang,trang_thai_giao) VALUES (?,'CHO_GIAO')`,
        [orderId],
      );
    }
    await conn.execute("DELETE FROM CHI_TIET_GIO_HANG WHERE ma_gio_hang=?", [
      calc.cartId,
    ]);
    await conn.execute(
      "UPDATE GIO_HANG SET ngay_cap_nhat=NOW() WHERE ma_gio_hang=?",
      [calc.cartId],
    );
    await conn.commit();
    return {
      ma_don_hang: orderId,
      ma_don: code,
      trang_thai_don: S.PENDING,
      phuong_thuc: data.phuong_thuc,
      trang_thai_thanh_toan: "CHUA_THANH_TOAN",
      ...publicQuote(computed),
      ghi_chu:
        data.phuong_thuc === "VNPAY"
          ? "Chua thanh toan. Module 6 se tao URL VNPay."
          : null,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
async function getDetail(id) {
  const [orders] = await pool.execute(
    `SELECT d.*, t.ma_thanh_toan,t.phuong_thuc,t.trang_thai_thanh_toan,t.so_tien,
            t.ma_giao_dich_vnpay,t.ngay_thanh_toan,
            vc.ma_van_chuyen,vc.don_vi_van_chuyen,vc.ma_van_don,vc.trang_thai_giao,
            vc.ngay_gui,vc.ngay_giao_thanh_cong
     FROM DON_HANG d
     LEFT JOIN THANH_TOAN t ON t.ma_don_hang=d.ma_don_hang
     LEFT JOIN VAN_CHUYEN vc ON vc.ma_don_hang=d.ma_don_hang
     WHERE d.ma_don_hang=? LIMIT 1`,
    [id],
  );
  if (!orders.length) throw fail(404, "Khong tim thay don hang.");
  const [items] = await pool.execute(
    `SELECT ma_chi_tiet_don,ma_bien_the,ten_san_pham_luu,ten_bien_the_luu,
           so_luong,don_gia,gia_tuy_chon,thanh_tien,tuy_chon_da_chon
      FROM CHI_TIET_DON_HANG WHERE ma_don_hang=? ORDER BY ma_chi_tiet_don`,
    [id],
  );
  return { ...orders[0], items };
}
async function customerOrders(userId, page, limit) {
  const offset = (page - 1) * limit;
  const [count] = await pool.execute(
    "SELECT COUNT(*) AS tong FROM DON_HANG WHERE ma_nguoi_dung=?",
    [userId],
  );
  const [rows] = await pool.execute(
    `SELECT d.ma_don_hang,d.ma_don,d.hinh_thuc_nhan,d.tong_tien,d.trang_thai_don,
            d.ngay_dat,d.ngay_hoan_thanh,t.phuong_thuc,t.trang_thai_thanh_toan
     FROM DON_HANG d LEFT JOIN THANH_TOAN t ON t.ma_don_hang=d.ma_don_hang
     WHERE d.ma_nguoi_dung=? ORDER BY d.ngay_dat DESC,d.ma_don_hang DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset],
  );
  return { page, limit, tong: Number(count[0].tong), items: rows };
}
async function guestLookup(code, phone) {
  const [rows] = await pool.execute(
    `SELECT ma_don_hang FROM DON_HANG WHERE ma_don=? AND sdt_nguoi_nhan=? AND ma_nguoi_dung IS NULL`,
    [code, phone],
  );
  if (!rows.length)
    throw fail(404, "Khong tim thay don khach voi thong tin da cung cap.");
  return getDetail(rows[0].ma_don_hang);
}
async function adminOrders({ page, limit, status, search }) {
  const where = [],
    params = [];
  if (status) {
    where.push("d.trang_thai_don=?");
    params.push(status);
  }
  if (search) {
    where.push("(d.ma_don LIKE ? OR d.ten_nguoi_nhan LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [count] = await pool.execute(
    `SELECT COUNT(*) AS tong FROM DON_HANG d ${w}`,
    params,
  );
  const [rows] = await pool.execute(
    `SELECT d.ma_don_hang,d.ma_don,d.ma_nguoi_dung,d.ma_nhan_vien,d.hinh_thuc_nhan,
            d.ten_nguoi_nhan,d.tong_tien,d.trang_thai_don,d.ngay_dat,
            t.phuong_thuc,t.trang_thai_thanh_toan
     FROM DON_HANG d LEFT JOIN THANH_TOAN t ON t.ma_don_hang=d.ma_don_hang ${w}
     ORDER BY d.ngay_dat DESC,d.ma_don_hang DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  );
  return { page, limit, tong: Number(count[0].tong), items: rows };
}
async function cancelOrder(id, actor) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      "SELECT * FROM DON_HANG WHERE ma_don_hang=? FOR UPDATE",
      [id],
    );
    if (!rows.length) throw fail(404, "Khong tim thay don hang.");
    const order = rows[0];
    if (actor.kind === "customer" && order.ma_nguoi_dung !== actor.userId)
      throw fail(404, "Khong tim thay don hang cua ban.");
    if (
      actor.kind === "guest" &&
      (order.ma_nguoi_dung !== null ||
        order.ma_don !== actor.code ||
        order.sdt_nguoi_nhan !== actor.phone)
    ) {
      throw fail(404, "Khong tim thay don khach.");
    }
    if (![S.PENDING, S.CONFIRMED].includes(order.trang_thai_don)) {
      throw fail(409, "Chi huy duoc don CHO_XAC_NHAN hoac DA_XAC_NHAN.");
    }
    if (actor.kind !== "staff" && order.trang_thai_don !== S.PENDING)
      throw fail(409, "Khach chi huy duoc khi cho xac nhan.");
    const [p] = await conn.execute(
      "SELECT phuong_thuc,trang_thai_thanh_toan,ma_giao_dich_vnpay FROM THANH_TOAN WHERE ma_don_hang=? FOR UPDATE",
      [id],
    );
    if (p[0] && p[0].trang_thai_thanh_toan === "THANH_CONG") {
      throw fail(
        409,
        "Don da thanh toan, khong huy tu dong vi chua co quy trinh hoan tien.",
      );
    }
    // Module 6: tranh hoan kho khi VNPay co the dang xu ly giao dich.
    // Chi cho phep huy khi chua tao link, hoac VNPay da xac nhan THAT_BAI.
    if (
      p[0]?.phuong_thuc === "VNPAY" &&
      p[0].ma_giao_dich_vnpay &&
      p[0].trang_thai_thanh_toan === "CHUA_THANH_TOAN"
    ) {
      throw fail(
        409,
        "Giao dich VNPay dang cho xac nhan. Khong the huy/hoan kho; can doi soat ket qua voi VNPay.",
      );
    }
    const [items] = await conn.execute(
      `SELECT ct.ma_bien_the,SUM(ct.so_luong) AS so_luong
       FROM CHI_TIET_DON_HANG ct JOIN BIEN_THE_SAN_PHAM b ON b.ma_bien_the=ct.ma_bien_the
       JOIN SAN_PHAM sp ON sp.ma_san_pham=b.ma_san_pham
       WHERE ct.ma_don_hang=? AND sp.loai_san_pham='DONG_GOI'
       GROUP BY ct.ma_bien_the ORDER BY ct.ma_bien_the`,
      [id],
    );
    // Tang kho mot lan nho khoa dong don hang va chuyen trang thai trong transaction.
    for (const item of items) {
      const [out] = await conn.execute(
        `UPDATE TON_KHO_SAN_PHAM SET so_luong_ton=so_luong_ton+?,ngay_cap_nhat=NOW() WHERE ma_bien_the=?`,
        [Number(item.so_luong), item.ma_bien_the],
      );
      if (out.affectedRows !== 1)
        throw fail(409, "Khong the hoan kho vi ban ghi ton kho da bi xoa.");
    }
    if (order.ma_giam_gia) {
      await conn.execute(
        "UPDATE MA_GIAM_GIA SET so_lan_da_dung=GREATEST(0,so_lan_da_dung-1) WHERE ma_giam_gia=?",
        [order.ma_giam_gia],
      );
    }
    await conn.execute(
      "UPDATE DON_HANG SET trang_thai_don='DA_HUY' WHERE ma_don_hang=?",
      [id],
    );
    if (order.hinh_thuc_nhan === SHIPPING)
      await conn.execute(
        "UPDATE VAN_CHUYEN SET trang_thai_giao='DA_HUY' WHERE ma_don_hang=?",
        [id],
      );
    await conn.commit();
    return {
      ma_don_hang: id,
      trang_thai_don: S.CANCELLED,
      thong_bao: "Da huy don va hoan kho ca phe dong goi (neu co).",
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
async function changeStatus(orderId, status, staffId, daThuTien = false) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      "SELECT * FROM DON_HANG WHERE ma_don_hang=? FOR UPDATE",
      [orderId],
    );
    if (!rows.length) throw fail(404, "Khong tim thay don hang.");
    const order = rows[0];
    if (status === S.CANCELLED) {
      throw fail(400, "Su dung API huy don de duoc hoan kho dung quy trinh.");
    }
    const transitions = {
      [S.PENDING]: [S.CONFIRMED],
      [S.CONFIRMED]: [S.PREPARING],
      [S.PREPARING]:
        order.hinh_thuc_nhan === SHIPPING ? [S.SHIPPING] : [S.READY],
      [S.SHIPPING]: [S.DONE],
      [S.READY]: [S.DONE],
      [S.CANCELLED]: [],
      [S.DONE]: [],
    };
    if (!transitions[order.trang_thai_don]?.includes(status)) {
      throw fail(409, `Khong the chuyen ${order.trang_thai_don} -> ${status}.`);
    }
    const [payments] = await conn.execute(
      "SELECT * FROM THANH_TOAN WHERE ma_don_hang=? FOR UPDATE",
      [orderId],
    );
    const payment = payments[0];
    if (!payment) throw fail(409, "Don hang thieu ban ghi thanh toan.");
    if (
      payment.phuong_thuc === "VNPAY" &&
      payment.trang_thai_thanh_toan !== "THANH_CONG"
    ) {
      throw fail(409, "Don VNPAY chua thanh toan thanh cong; chua the xu ly.");
    }
    if (status === S.DONE) {
      if (["COD", "TIEN_MAT"].includes(payment.phuong_thuc)) {
        if (payment.trang_thai_thanh_toan !== "CHUA_THANH_TOAN") {
          throw fail(409, "Trang thai thanh toan khong phu hop de thu tien.");
        }
        if (!daThuTien)
          throw fail(
            400,
            "Can da_thu_tien=true neu da nhan du tien COD/TIEN_MAT.",
          );
        // Chi danh dau THANH_CONG khi nhan vien chu dong xac nhan da thu du tien.
        await conn.execute(
          "UPDATE THANH_TOAN SET trang_thai_thanh_toan='THANH_CONG',ngay_thanh_toan=NOW() WHERE ma_don_hang=?",
          [orderId],
        );
      }
    }
    await conn.execute(
      `UPDATE DON_HANG SET trang_thai_don=?,ma_nhan_vien=COALESCE(ma_nhan_vien,?),
       ngay_hoan_thanh=IF(?='HOAN_THANH',NOW(),ngay_hoan_thanh) WHERE ma_don_hang=?`,
      [status, staffId, status, orderId],
    );
    if (
      order.hinh_thuc_nhan === SHIPPING &&
      [S.SHIPPING, S.DONE].includes(status)
    ) {
      await conn.execute(
        `UPDATE VAN_CHUYEN SET trang_thai_giao=?,
         ngay_gui=IF(?='DANG_GIAO',COALESCE(ngay_gui,NOW()),ngay_gui),
         ngay_giao_thanh_cong=IF(?='HOAN_THANH',NOW(),ngay_giao_thanh_cong)
         WHERE ma_don_hang=?`,
        [
          status === S.SHIPPING ? "DANG_GIAO" : "DA_GIAO",
          status,
          status,
          orderId,
        ],
      );
    }
    await conn.commit();
    return {
      ma_don_hang: orderId,
      trang_thai_cu: order.trang_thai_don,
      trang_thai_moi: status,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
async function updateShipment(orderId, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      "SELECT hinh_thuc_nhan,trang_thai_don FROM DON_HANG WHERE ma_don_hang=? FOR UPDATE",
      [orderId],
    );
    if (!rows.length) throw fail(404, "Khong tim thay don hang.");
    if (rows[0].hinh_thuc_nhan !== SHIPPING)
      throw fail(409, "Don nay khong giao tan noi.");
    if ([S.CANCELLED, S.DONE].includes(rows[0].trang_thai_don))
      throw fail(409, "Don da dong, khong the sua van chuyen.");
    const fields = [],
      params = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key}=?`);
      params.push(val);
    }
    const [r] = await conn.execute(
      `UPDATE VAN_CHUYEN SET ${fields.join(",")} WHERE ma_don_hang=?`,
      [...params, orderId],
    );
    if (!r.affectedRows) throw fail(409, "Chua co ban ghi van chuyen cho don.");
    await conn.commit();
    return { ma_don_hang: orderId, ...data };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
module.exports = {
  S,
  SHIPPING,
  PICKUP,
  METHODS,
  positiveInt,
  fail,
  preview,
  create,
  getDetail,
  customerOrders,
  guestLookup,
  adminOrders,
  cancelOrder,
  changeStatus,
  updateShipment,
};
