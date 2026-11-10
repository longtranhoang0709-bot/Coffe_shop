-- =============================================================
-- DU AN: Website ban ca phe (coffeShop)
-- MySQL 8.0.16+ / InnoDB / utf8mb4
-- Chuyen doi tu file coffe_demo_sqlserver(1).sql (SQL Server)
-- Tao 19 bang, 21 khoa ngoai. KHONG them du lieu mau.
-- Chay mot lan trong MySQL Workbench tren database moi.
-- Khong co DROP TABLE / DROP DATABASE de tranh xoa du lieu.
-- Chu y: truong quan_huyen duoc giu tu file cu, nhung de NULL
-- vi dia chi hanh chinh moi co the khong can cap quan/huyen.
-- JSON goc NVARCHAR(MAX) -> JSON; CHECK ISJSON khong can.
-- Index loc SQL Server -> unique index bieu thuc cua MySQL 8.
-- =============================================================

CREATE DATABASE IF NOT EXISTS `coffe_demo`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `coffe_demo`;

-- 01. VAI_TRO
CREATE TABLE IF NOT EXISTS `VAI_TRO` (
    ma_vai_tro INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ky_hieu_vai_tro VARCHAR(30) NOT NULL UNIQUE,
    ten_vai_tro VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 02. NGUOI_DUNG
CREATE TABLE IF NOT EXISTS `NGUOI_DUNG` (
    ma_nguoi_dung INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_vai_tro INT NOT NULL,
    ho_ten VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    so_dien_tho VARCHAR(20) NULL,
    mat_khau_ma_hoa VARCHAR(255) NOT NULL,
    trang_thai VARCHAR(30) NOT NULL DEFAULT 'HOAT_DONG',
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_NGUOI_DUNG_VAI_TRO
        FOREIGN KEY (ma_vai_tro) REFERENCES VAI_TRO(ma_vai_tro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 03. DIA_CHI_NGUOI_DUNG
CREATE TABLE IF NOT EXISTS `DIA_CHI_NGUOI_DUNG` (
    ma_dia_chi INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_nguoi_dung INT NOT NULL,
    ten_nguoi_nhan VARCHAR(150) NOT NULL,
    sdt_nguoi_nhan VARCHAR(20) NOT NULL,
    tinh_thanh VARCHAR(100) NOT NULL,
    quan_huyen VARCHAR(100) NULL,
    phuong_xa VARCHAR(100) NOT NULL,
    dia_chi_chi_tiet VARCHAR(255) NOT NULL,
    la_mac_dinh TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT FK_DIA_CHI_NGUOI_DUNG_NGUOI_DUNG
        FOREIGN KEY (ma_nguoi_dung) REFERENCES NGUOI_DUNG(ma_nguoi_dung),
    UNIQUE KEY UX_DIA_CHI_MAC_DINH ((CASE WHEN la_mac_dinh = 1 THEN ma_nguoi_dung ELSE NULL END))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 04. DANH_MUC
CREATE TABLE IF NOT EXISTS `DANH_MUC` (
    ma_danh_muc INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ten_danh_muc VARCHAR(150) NOT NULL,
    mo_ta VARCHAR(255) NULL,
    dang_hoat_dong TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 05. SAN_PHAM
CREATE TABLE IF NOT EXISTS `SAN_PHAM` (
    ma_san_pham INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_danh_muc INT NOT NULL,
    ten_san_pham VARCHAR(200) NOT NULL,
    loai_san_pham VARCHAR(50) NOT NULL,
    mo_ta LONGTEXT NULL,
    dang_ban TINYINT(1) NOT NULL DEFAULT 1,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_SAN_PHAM_DANH_MUC
        FOREIGN KEY (ma_danh_muc) REFERENCES DANH_MUC(ma_danh_muc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 06. HINH_ANH_SAN_PHAM
CREATE TABLE IF NOT EXISTS `HINH_ANH_SAN_PHAM` (
    ma_hinh_anh INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_san_pham INT NOT NULL,
    duong_dan_anh VARCHAR(500) NOT NULL,
    la_anh_chinh TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT FK_HINH_ANH_SAN_PHAM_SAN_PHAM
        FOREIGN KEY (ma_san_pham) REFERENCES SAN_PHAM(ma_san_pham),
    UNIQUE KEY UX_HINH_ANH_CHINH ((CASE WHEN la_anh_chinh = 1 THEN ma_san_pham ELSE NULL END))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 07. BIEN_THE_SAN_PHAM
CREATE TABLE IF NOT EXISTS `BIEN_THE_SAN_PHAM` (
    ma_bien_the INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_san_pham INT NOT NULL,
    ma_sku VARCHAR(50) NOT NULL UNIQUE,
    ten_bien_the VARCHAR(150) NOT NULL,
    kich_co VARCHAR(50) NULL,
    khoi_luong_gram INT NULL,
    loai_hat VARCHAR(100) NULL,
    do_xay VARCHAR(100) NULL,
    gia_ban DECIMAL(12,2) NOT NULL,
    dang_ban TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT FK_BIEN_THE_SAN_PHAM_SAN_PHAM
        FOREIGN KEY (ma_san_pham) REFERENCES SAN_PHAM(ma_san_pham),
    CONSTRAINT CK_BIEN_THE_KHOI_LUONG
        CHECK (khoi_luong_gram IS NULL OR khoi_luong_gram > 0),
    CONSTRAINT CK_BIEN_THE_GIA_BAN
        CHECK (gia_ban >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 08. NHOM_TUY_CHON
CREATE TABLE IF NOT EXISTS `NHOM_TUY_CHON` (
    ma_nhom_tuy_chon INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_san_pham INT NOT NULL,
    ten_nhom VARCHAR(150) NOT NULL,
    bat_buoc_chon TINYINT(1) NOT NULL DEFAULT 0,
    cho_chon_nhieu TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT FK_NHOM_TUY_CHON_SAN_PHAM
        FOREIGN KEY (ma_san_pham) REFERENCES SAN_PHAM(ma_san_pham)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 09. GIA_TRI_TUY_CHON
CREATE TABLE IF NOT EXISTS `GIA_TRI_TUY_CHON` (
    ma_tuy_chon INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_nhom_tuy_chon INT NOT NULL,
    ten_tuy_chon VARCHAR(150) NOT NULL,
    gia_them DECIMAL(12,2) NOT NULL DEFAULT 0,
    dang_ban TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT FK_GIA_TRI_TUY_CHON_NHOM_TUY_CHON
        FOREIGN KEY (ma_nhom_tuy_chon) REFERENCES NHOM_TUY_CHON(ma_nhom_tuy_chon),
    CONSTRAINT CK_GIA_TRI_TUY_CHON_GIA_THEM
        CHECK (gia_them >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TON_KHO_SAN_PHAM
CREATE TABLE IF NOT EXISTS `TON_KHO_SAN_PHAM` (
    ma_ton_kho INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_bien_the INT NOT NULL UNIQUE,
    so_luong_ton INT NOT NULL DEFAULT 0,
    muc_ton_toi_thieu INT NOT NULL DEFAULT 0,
    ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_TON_KHO_SAN_PHAM_BIEN_THE
        FOREIGN KEY (ma_bien_the) REFERENCES BIEN_THE_SAN_PHAM(ma_bien_the),
    CONSTRAINT CK_TON_KHO_SO_LUONG
        CHECK (so_luong_ton >= 0 AND muc_ton_toi_thieu >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. GIO_HANG
CREATE TABLE IF NOT EXISTS `GIO_HANG` (
    ma_gio_hang INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_nguoi_dung INT NULL,
    ma_phien_khach VARCHAR(100) NULL,
    ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_GIO_HANG_NGUOI_DUNG
        FOREIGN KEY (ma_nguoi_dung) REFERENCES NGUOI_DUNG(ma_nguoi_dung),
    CONSTRAINT CK_GIO_HANG_CHU_SO_HUU
        CHECK (ma_nguoi_dung IS NOT NULL OR ma_phien_khach IS NOT NULL),
    UNIQUE KEY UX_GIO_HANG_MA_PHIEN_KHACH (ma_phien_khach),
    UNIQUE KEY UX_GIO_HANG_NGUOI_DUNG (ma_nguoi_dung)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. CHI_TIET_GIO_HANG
CREATE TABLE IF NOT EXISTS `CHI_TIET_GIO_HANG` (
    ma_chi_tiet_gio INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_gio_hang INT NOT NULL,
    ma_bien_the INT NOT NULL,
    so_luong INT NOT NULL,
    tuy_chon_da_chon JSON NULL,
    ghi_chu LONGTEXT NULL,
    CONSTRAINT FK_CHI_TIET_GIO_HANG_GIO_HANG
        FOREIGN KEY (ma_gio_hang) REFERENCES GIO_HANG(ma_gio_hang),
    CONSTRAINT FK_CHI_TIET_GIO_HANG_BIEN_THE
        FOREIGN KEY (ma_bien_the) REFERENCES BIEN_THE_SAN_PHAM(ma_bien_the),
    CONSTRAINT CK_CHI_TIET_GIO_HANG_SO_LUONG
        CHECK (so_luong > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. MA_GIAM_GIA
CREATE TABLE IF NOT EXISTS `MA_GIAM_GIA` (
    ma_giam_gia INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_code VARCHAR(50) NOT NULL UNIQUE,
    loai_giam VARCHAR(30) NOT NULL,
    gia_tri_giam DECIMAL(12,2) NOT NULL,
    don_toi_thieu DECIMAL(12,2) NULL,
    giam_toi_da DECIMAL(12,2) NULL,
    gioi_han_su_dung INT NULL,
    so_lan_da_dung INT NOT NULL DEFAULT 0,
    ngay_bat_dau DATETIME NOT NULL,
    ngay_ket_thuc DATETIME NOT NULL,
    dang_ap_dung TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT CK_MA_GIAM_GIA_GIA_TRI
        CHECK (gia_tri_giam > 0
           AND (don_toi_thieu IS NULL OR don_toi_thieu >= 0)
           AND (giam_toi_da IS NULL OR giam_toi_da >= 0)),
    CONSTRAINT CK_MA_GIAM_GIA_LUOT_DUNG
        CHECK (so_lan_da_dung >= 0
           AND (gioi_han_su_dung IS NULL OR gioi_han_su_dung >= 0)),
    CONSTRAINT CK_MA_GIAM_GIA_THOI_GIAN
        CHECK (ngay_ket_thuc > ngay_bat_dau)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. KHU_VUC_GIAO_HANG
CREATE TABLE IF NOT EXISTS `KHU_VUC_GIAO_HANG` (
    ma_khu_vuc INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ten_khu_vuc VARCHAR(150) NOT NULL,
    tinh_thanh VARCHAR(100) NOT NULL,
    phuong_xa VARCHAR(100) NOT NULL,
    cho_giao_do_uong TINYINT(1) NOT NULL DEFAULT 1,
    cho_giao_dong_goi TINYINT(1) NOT NULL DEFAULT 1,
    phi_giao_hang DECIMAL(12,2) NOT NULL DEFAULT 0,
    dang_ap_dung TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT CK_KHU_VUC_GIAO_HANG_PHI
        CHECK (phi_giao_hang >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. DON_HANG
CREATE TABLE IF NOT EXISTS `DON_HANG` (
    ma_don_hang INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_don VARCHAR(50) NOT NULL UNIQUE,
    ma_nguoi_dung INT NULL,
    ma_nhan_vien INT NULL,
    ma_khu_vuc INT NULL,
    ma_giam_gia INT NULL,
    hinh_thuc_nhan VARCHAR(30) NOT NULL,
    ten_nguoi_nhan VARCHAR(150) NOT NULL,
    sdt_nguoi_nhan VARCHAR(20) NOT NULL,
    tinh_thanh VARCHAR(100) NULL,
    phuong_xa VARCHAR(100) NULL,
    dia_chi_giao_hang VARCHAR(255) NULL,
    thoi_gian_nhan DATETIME NULL,
    tam_tinh DECIMAL(12,2) NOT NULL,
    tien_giam DECIMAL(12,2) NOT NULL DEFAULT 0,
    phi_giao DECIMAL(12,2) NOT NULL DEFAULT 0,
    tong_tien DECIMAL(12,2) NOT NULL,
    trang_thai_don VARCHAR(30) NOT NULL DEFAULT 'CHO_XAC_NHAN',
    ghi_chu LONGTEXT NULL,
    ngay_dat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_hoan_thanh DATETIME NULL,
    CONSTRAINT FK_DON_HANG_NGUOI_DUNG
        FOREIGN KEY (ma_nguoi_dung) REFERENCES NGUOI_DUNG(ma_nguoi_dung),
    CONSTRAINT FK_DON_HANG_NHAN_VIEN
        FOREIGN KEY (ma_nhan_vien) REFERENCES NGUOI_DUNG(ma_nguoi_dung),
    CONSTRAINT FK_DON_HANG_KHU_VUC
        FOREIGN KEY (ma_khu_vuc) REFERENCES KHU_VUC_GIAO_HANG(ma_khu_vuc),
    CONSTRAINT FK_DON_HANG_MA_GIAM_GIA
        FOREIGN KEY (ma_giam_gia) REFERENCES MA_GIAM_GIA(ma_giam_gia),
    CONSTRAINT CK_DON_HANG_SO_TIEN
        CHECK (tam_tinh >= 0 AND tien_giam >= 0
           AND phi_giao >= 0 AND tong_tien >= 0),
    KEY IX_DON_HANG_NGAY_DAT (ngay_dat),
    KEY IX_DON_HANG_BAO_CAO (trang_thai_don, ngay_hoan_thanh)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. CHI_TIET_DON_HANG
CREATE TABLE IF NOT EXISTS `CHI_TIET_DON_HANG` (
    ma_chi_tiet_don INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_don_hang INT NOT NULL,
    ma_bien_the INT NOT NULL,
    ten_san_pham_luu VARCHAR(200) NOT NULL,
    ten_bien_the_luu VARCHAR(150) NOT NULL,
    so_luong INT NOT NULL,
    don_gia DECIMAL(12,2) NOT NULL,
    gia_tuy_chon DECIMAL(12,2) NOT NULL DEFAULT 0,
    thanh_tien DECIMAL(12,2) NOT NULL,
    tuy_chon_da_chon JSON NULL,
    CONSTRAINT FK_CHI_TIET_DON_HANG_DON_HANG
        FOREIGN KEY (ma_don_hang) REFERENCES DON_HANG(ma_don_hang),
    CONSTRAINT FK_CHI_TIET_DON_HANG_BIEN_THE
        FOREIGN KEY (ma_bien_the) REFERENCES BIEN_THE_SAN_PHAM(ma_bien_the),
    CONSTRAINT CK_CHI_TIET_DON_HANG_SO_LUONG
        CHECK (so_luong > 0),
    CONSTRAINT CK_CHI_TIET_DON_HANG_GIA
        CHECK (don_gia >= 0 AND gia_tuy_chon >= 0 AND thanh_tien >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. THANH_TOAN
CREATE TABLE IF NOT EXISTS `THANH_TOAN` (
    ma_thanh_toan INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_don_hang INT NOT NULL UNIQUE,
    phuong_thuc VARCHAR(30) NOT NULL,
    trang_thai_thanh_toan VARCHAR(30) NOT NULL DEFAULT 'CHUA_THANH_TOAN',
    so_tien DECIMAL(12,2) NOT NULL,
    ma_giao_dich_vnpay VARCHAR(100) NULL,
    ngay_thanh_toan DATETIME NULL,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_THANH_TOAN_DON_HANG
        FOREIGN KEY (ma_don_hang) REFERENCES DON_HANG(ma_don_hang),
    CONSTRAINT CK_THANH_TOAN_SO_TIEN
        CHECK (so_tien >= 0),
    UNIQUE KEY UX_THANH_TOAN_MA_GIAO_DICH_VNPAY (ma_giao_dich_vnpay),
    KEY IX_THANH_TOAN_TRANG_THAI (trang_thai_thanh_toan, ngay_thanh_toan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. VAN_CHUYEN
CREATE TABLE IF NOT EXISTS `VAN_CHUYEN` (
    ma_van_chuyen INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_don_hang INT NOT NULL UNIQUE,
    don_vi_van_chuyen VARCHAR(150) NULL,
    ma_van_don VARCHAR(100) NULL,
    trang_thai_giao VARCHAR(30) NOT NULL DEFAULT 'CHO_GIAO',
    ngay_gui DATETIME NULL,
    ngay_giao_thanh_cong DATETIME NULL,
    CONSTRAINT FK_VAN_CHUYEN_DON_HANG
        FOREIGN KEY (ma_don_hang) REFERENCES DON_HANG(ma_don_hang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. DANH_GIA
CREATE TABLE IF NOT EXISTS `DANH_GIA` (
    ma_danh_gia INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    ma_nguoi_dung INT NOT NULL,
    ma_chi_tiet_don INT NOT NULL UNIQUE,
    so_sao INT NOT NULL,
    noi_dung LONGTEXT NULL,
    ngay_danh_gia DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_DANH_GIA_NGUOI_DUNG
        FOREIGN KEY (ma_nguoi_dung) REFERENCES NGUOI_DUNG(ma_nguoi_dung),
    CONSTRAINT FK_DANH_GIA_CHI_TIET_DON_HANG
        FOREIGN KEY (ma_chi_tiet_don) REFERENCES CHI_TIET_DON_HANG(ma_chi_tiet_don),
    CONSTRAINT CK_DANH_GIA_SO_SAO CHECK (so_sao BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- KIEM TRA SAU KHI CHAY
-- =============================================================
SELECT COUNT(*) AS tong_so_bang
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'coffe_demo' AND TABLE_TYPE = 'BASE TABLE';

SELECT COUNT(*) AS tong_so_khoa_ngoai
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'coffe_demo';

SELECT TABLE_NAME AS ten_bang
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'coffe_demo' AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

USE `coffe_demo`;
INSERT IGNORE INTO `VAI_TRO` (`ky_hieu_vai_tro`, `ten_vai_tro`)
VALUES
    ('CUSTOMER', 'Khach hang'),
    ('STAFF', 'Nhan vien'),
    ('ADMIN', 'Quan tri vien');

-- NGUOI_DUNG: 4 dong demo
INSERT INTO `NGUOI_DUNG` (`ma_nguoi_dung`, `ma_vai_tro`, `ho_ten`, `email`, `so_dien_tho`, `mat_khau_ma_hoa`, `trang_thai`)
VALUES
    (9001, (SELECT ma_vai_tro FROM VAI_TRO WHERE ky_hieu_vai_tro = 'ADMIN' LIMIT 1), 'Quan tri Demo', 'demo-admin@example.com', '0900000001', '$2b$12$1rtOldsYxfEizde.NW49t.zH5tB1SjvxvSyqE1/aoaiVFQ.PL6kGK', 'HOAT_DONG'),
    (9002, (SELECT ma_vai_tro FROM VAI_TRO WHERE ky_hieu_vai_tro = 'STAFF' LIMIT 1), 'Nhan vien Demo', 'demo-staff@example.com', '0900000002', '$2b$12$MWWP31A0K.hBVDvR3K6wE.Vmoc0OXyb/wujChwdHZMiNhVh5Y/7su', 'HOAT_DONG'),
    (9003, (SELECT ma_vai_tro FROM VAI_TRO WHERE ky_hieu_vai_tro = 'CUSTOMER' LIMIT 1), 'Khach hang Demo 1', 'demo-khach@example.com', '0900000003', '$2b$12$6VCC/was1zykrYEm01ldP.83Ny6suzyjf3rk1FqT2Q2cDLB/Av7dC', 'HOAT_DONG'),
    (9004, (SELECT ma_vai_tro FROM VAI_TRO WHERE ky_hieu_vai_tro = 'CUSTOMER' LIMIT 1), 'Khach hang Demo 2', 'demo-khach2@example.com', '0900000004', '$2b$12$ozVQN5fFbERtttBToSq4i.No6K/1B/sVtar7JpVr3C4dlp5GTSsWe', 'HOAT_DONG')
ON DUPLICATE KEY UPDATE `ma_nguoi_dung` = `ma_nguoi_dung`;
-- DIA_CHI_NGUOI_DUNG: 3 dong demo
INSERT INTO `DIA_CHI_NGUOI_DUNG` (`ma_dia_chi`, `ma_nguoi_dung`, `ten_nguoi_nhan`, `sdt_nguoi_nhan`, `tinh_thanh`, `quan_huyen`, `phuong_xa`, `dia_chi_chi_tiet`, `la_mac_dinh`)
VALUES
    (9001, 9003, 'Khach Demo 1', '0900000003', 'TP Ho Chi Minh', NULL, 'Phuong Ben Thanh', 'So 10 Duong Mau 1', 1),
    (9002, 9003, 'Khach Demo 1', '0900000003', 'Ha Noi', NULL, 'Phuong Hoan Kiem', 'So 20 Duong Mau 2', 0),
    (9003, 9004, 'Khach Demo 2', '0900000004', 'TP Ho Chi Minh', NULL, 'Phuong Sai Gon', 'So 30 Duong Mau 3', 1)
ON DUPLICATE KEY UPDATE `ma_dia_chi` = `ma_dia_chi`;

-- DANH_MUC: 4 dong demo
INSERT INTO `DANH_MUC` (`ma_danh_muc`, `ten_danh_muc`, `mo_ta`)
VALUES
    (9001, 'Ca phe pha che', 'Ca phe phuc vu tai quan, mang di va giao noi thanh'),
    (9002, 'Do uong khac', 'Tra va cac mon uong khac'),
    (9003, 'Ca phe hat', 'Ca phe hat nguyen chat dong goi'),
    (9004, 'Ca phe bot', 'Ca phe bot rang xay dong goi')
ON DUPLICATE KEY UPDATE `ma_danh_muc` = `ma_danh_muc`;

-- SAN_PHAM: 7 dong demo
INSERT INTO `SAN_PHAM` (`ma_san_pham`, `ma_danh_muc`, `ten_san_pham`, `loai_san_pham`, `mo_ta`)
VALUES
    (9001, 9001, 'Ca phe sua da', 'DO_UONG', 'Ca phe phin pha cung sua dac'),
    (9002, 9001, 'Americano', 'DO_UONG', 'Espresso pha voi nuoc'),
    (9003, 9001, 'Bac xiu', 'DO_UONG', 'Do uong ca phe va sua'),
    (9004, 9002, 'Tra dao', 'DO_UONG', 'Tra vi dao'),
    (9005, 9003, 'Robusta nguyen hat', 'DONG_GOI', 'Ca phe hat Robusta dong goi'),
    (9006, 9003, 'Arabica nguyen hat', 'DONG_GOI', 'Ca phe hat Arabica dong goi'),
    (9007, 9004, 'Arabica xay bot', 'DONG_GOI', 'Ca phe Arabica xay san')
ON DUPLICATE KEY UPDATE `ma_san_pham` = `ma_san_pham`;

-- HINH_ANH_SAN_PHAM: 8 dong demo
INSERT INTO `HINH_ANH_SAN_PHAM` (`ma_hinh_anh`, `ma_san_pham`, `duong_dan_anh`, `la_anh_chinh`)
VALUES
    (9001, 9001, '/uploads/products/ca-phe-sua-da.jpg', 1),
    (9002, 9002, '/uploads/products/americano.jpg', 1),
    (9003, 9003, '/uploads/products/bac-xiu.jpg', 1),
    (9004, 9004, '/uploads/products/tra-dao.jpg', 1),
    (9005, 9005, '/uploads/products/robusta-hat.jpg', 1),
    (9006, 9006, '/uploads/products/arabica-hat.jpg', 1),
    (9007, 9007, '/uploads/products/arabica-bot.jpg', 1),
    (9008, 9005, '/uploads/products/robusta-hat-2.jpg', 0)
ON DUPLICATE KEY UPDATE `ma_hinh_anh` = `ma_hinh_anh`;

-- BIEN_THE_SAN_PHAM: 10 dong demo
INSERT INTO `BIEN_THE_SAN_PHAM` (`ma_bien_the`, `ma_san_pham`, `ma_sku`, `ten_bien_the`, `kich_co`, `khoi_luong_gram`, `loai_hat`, `do_xay`, `gia_ban`)
VALUES
    (9001, 9001, 'DEMO-CS-S', 'Size S', 'S', NULL, NULL, NULL, 25000),
    (9002, 9001, 'DEMO-CS-M', 'Size M', 'M', NULL, NULL, NULL, 30000),
    (9003, 9002, 'DEMO-AM-M', 'Size M', 'M', NULL, NULL, NULL, 35000),
    (9004, 9002, 'DEMO-AM-L', 'Size L', 'L', NULL, NULL, NULL, 42000),
    (9005, 9003, 'DEMO-BX-M', 'Size M', 'M', NULL, NULL, NULL, 32000),
    (9006, 9004, 'DEMO-TD-M', 'Size M', 'M', NULL, NULL, NULL, 30000),
    (9007, 9005, 'DEMO-ROB-250', 'Goi 250g', NULL, 250, 'Robusta', 'Nguyen hat', 85000),
    (9008, 9005, 'DEMO-ROB-500', 'Goi 500g', NULL, 500, 'Robusta', 'Nguyen hat', 160000),
    (9009, 9006, 'DEMO-ARA-H250', 'Goi 250g', NULL, 250, 'Arabica', 'Nguyen hat', 125000),
    (9010, 9007, 'DEMO-ARA-B250', 'Goi 250g', NULL, 250, 'Arabica', 'Xay vua', 125000)
ON DUPLICATE KEY UPDATE `ma_bien_the` = `ma_bien_the`;

-- NHOM_TUY_CHON: 5 dong demo
INSERT INTO `NHOM_TUY_CHON` (`ma_nhom_tuy_chon`, `ma_san_pham`, `ten_nhom`, `bat_buoc_chon`, `cho_chon_nhieu`)
VALUES
    (9001, 9001, 'Luong duong', 1, 0),
    (9002, 9001, 'Luong da', 0, 0),
    (9003, 9001, 'Topping', 0, 1),
    (9004, 9002, 'Luong da', 0, 0),
    (9005, 9003, 'Luong duong', 0, 0)
ON DUPLICATE KEY UPDATE `ma_nhom_tuy_chon` = `ma_nhom_tuy_chon`;

-- GIA_TRI_TUY_CHON: 10 dong demo
INSERT INTO `GIA_TRI_TUY_CHON` (`ma_tuy_chon`, `ma_nhom_tuy_chon`, `ten_tuy_chon`, `gia_them`)
VALUES
    (9001, 9001, '0 phan tram', 0),
    (9002, 9001, '50 phan tram', 0),
    (9003, 9001, '100 phan tram', 0),
    (9004, 9002, 'It da', 0),
    (9005, 9002, 'Da binh thuong', 0),
    (9006, 9003, 'Kem sua', 5000),
    (9007, 9003, 'Thach ca phe', 6000),
    (9008, 9004, 'Khong da', 0),
    (9009, 9004, 'Da binh thuong', 0),
    (9010, 9005, '50 phan tram', 0)
ON DUPLICATE KEY UPDATE `ma_tuy_chon` = `ma_tuy_chon`;

-- TON_KHO_SAN_PHAM: 4 dong demo
INSERT INTO `TON_KHO_SAN_PHAM` (`ma_ton_kho`, `ma_bien_the`, `so_luong_ton`, `muc_ton_toi_thieu`)
VALUES
    (9001, 9007, 30, 5),
    (9002, 9008, 22, 5),
    (9003, 9009, 12, 4),
    (9004, 9010, 18, 5)
ON DUPLICATE KEY UPDATE `ma_ton_kho` = `ma_ton_kho`;

-- GIO_HANG: 3 dong demo
INSERT INTO `GIO_HANG` (`ma_gio_hang`, `ma_nguoi_dung`, `ma_phien_khach`)
VALUES
    (9001, 9003, NULL),
    (9002, 9004, NULL),
    (9003, NULL, 'GUEST-DEMO-9003')
ON DUPLICATE KEY UPDATE `ma_gio_hang` = `ma_gio_hang`;

-- CHI_TIET_GIO_HANG: 4 dong demo
INSERT INTO `CHI_TIET_GIO_HANG` (`ma_chi_tiet_gio`, `ma_gio_hang`, `ma_bien_the`, `so_luong`, `tuy_chon_da_chon`, `ghi_chu`)
VALUES
    (9001, 9001, 9002, 2, '[{"ma_tuy_chon":9002,"ten":"50 phan tram","gia_them":0},{"ma_tuy_chon":9006,"ten":"Kem sua","gia_them":5000}]', 'It da'),
    (9002, 9001, 9007, 1, NULL, NULL),
    (9003, 9002, 9010, 1, NULL, NULL),
    (9004, 9003, 9003, 1, '[{"ma_tuy_chon":9009,"ten":"Da binh thuong","gia_them":0}]', NULL)
ON DUPLICATE KEY UPDATE `ma_chi_tiet_gio` = `ma_chi_tiet_gio`;

-- MA_GIAM_GIA: 2 dong demo
INSERT INTO `MA_GIAM_GIA` (`ma_giam_gia`, `ma_code`, `loai_giam`, `gia_tri_giam`, `don_toi_thieu`, `giam_toi_da`, `gioi_han_su_dung`, `so_lan_da_dung`, `ngay_bat_dau`, `ngay_ket_thuc`)
VALUES
    (9001, 'CAFE10', 'PHAN_TRAM', 10, 50000, 30000, 100, 1, (NOW() - INTERVAL 30 DAY), (NOW() + INTERVAL 180 DAY)),
    (9002, 'GIAM15K', 'SO_TIEN', 15000, 100000, NULL, 50, 1, (NOW() - INTERVAL 30 DAY), (NOW() + INTERVAL 180 DAY))
ON DUPLICATE KEY UPDATE `ma_giam_gia` = `ma_giam_gia`;

-- KHU_VUC_GIAO_HANG: 4 dong demo
INSERT INTO `KHU_VUC_GIAO_HANG` (`ma_khu_vuc`, `ten_khu_vuc`, `tinh_thanh`, `phuong_xa`, `cho_giao_do_uong`, `cho_giao_dong_goi`, `phi_giao_hang`)
VALUES
    (9001, 'Noi thanh - Ben Thanh', 'TP Ho Chi Minh', 'Phuong Ben Thanh', 1, 1, 15000),
    (9002, 'Noi thanh - Sai Gon', 'TP Ho Chi Minh', 'Phuong Sai Gon', 1, 1, 18000),
    (9003, 'Lien tinh - Ha Noi', 'Ha Noi', 'Phuong Hoan Kiem', 0, 1, 35000),
    (9004, 'Lien tinh - Da Nang', 'Da Nang', 'Phuong Hai Chau', 0, 1, 30000)
ON DUPLICATE KEY UPDATE `ma_khu_vuc` = `ma_khu_vuc`;

-- DON_HANG: 7 dong demo
INSERT INTO `DON_HANG` (`ma_don_hang`, `ma_don`, `ma_nguoi_dung`, `ma_nhan_vien`, `ma_khu_vuc`, `ma_giam_gia`, `hinh_thuc_nhan`, `ten_nguoi_nhan`, `sdt_nguoi_nhan`, `tinh_thanh`, `phuong_xa`, `dia_chi_giao_hang`, `tam_tinh`, `tien_giam`, `phi_giao`, `tong_tien`, `trang_thai_don`, `ghi_chu`, `ngay_dat`, `ngay_hoan_thanh`)
VALUES
    (9001, 'DEMO-DH-9001', 9003, 9002, 9001, 9001, 'GIAO_TAN_NOI', 'Khach Demo 1', '0900000003', 'TP Ho Chi Minh', 'Phuong Ben Thanh', 'So 10 Duong Mau 1', 105000, 10500, 15000, 109500, 'HOAN_THANH', 'Don do uong da giao', (NOW() - INTERVAL 3 DAY), (NOW() - INTERVAL 2 DAY)),
    (9002, 'DEMO-DH-9002', 9004, 9002, 9003, 9002, 'GIAO_TAN_NOI', 'Khach Demo 2', '0900000004', 'Ha Noi', 'Phuong Hoan Kiem', 'So 20 Duong Mau 2', 285000, 15000, 35000, 305000, 'DANG_GIAO', 'Ca phe dong goi giao lien tinh', (NOW() - INTERVAL 2 DAY), NULL),
    (9003, 'DEMO-DH-9003', 9003, 9002, NULL, NULL, 'MANG_DI', 'Khach Demo 1', '0900000003', NULL, NULL, NULL, 32000, 0, 0, 32000, 'DANG_CHUAN_BI', 'Khach se ghe lay', NOW(), NULL),
    (9004, 'DEMO-DH-9004', NULL, NULL, 9002, NULL, 'GIAO_TAN_NOI', 'Khach Vang Lai Demo', '0900000005', 'TP Ho Chi Minh', 'Phuong Sai Gon', 'So 40 Duong Mau 4', 60000, 0, 18000, 78000, 'CHO_XAC_NHAN', NULL, NOW(), NULL),
    (9005, 'DEMO-DH-9005', 9004, 9002, NULL, NULL, 'TAI_QUAN', 'Khach Demo 2', '0900000004', NULL, NULL, NULL, 67000, 0, 0, 67000, 'HOAN_THANH', 'Thanh toan tai quay', (NOW() - INTERVAL 1 DAY), (NOW() - INTERVAL 1 DAY)),
    (9006, 'DEMO-DH-9006', 9003, NULL, 9001, NULL, 'GIAO_TAN_NOI', 'Khach Demo 1', '0900000003', 'TP Ho Chi Minh', 'Phuong Ben Thanh', 'So 10 Duong Mau 1', 85000, 0, 15000, 100000, 'DA_HUY', 'Khach huy don thanh toan that bai', (NOW() - INTERVAL 1 DAY), NULL),
    (9007, 'DEMO-DH-9007', 9004, 9002, 9004, NULL, 'GIAO_TAN_NOI', 'Khach Demo 2', '0900000004', 'Da Nang', 'Phuong Hai Chau', 'So 70 Duong Mau 7', 125000, 0, 30000, 155000, 'DA_XAC_NHAN', 'Cho dong goi', NOW(), NULL)
ON DUPLICATE KEY UPDATE `ma_don_hang` = `ma_don_hang`;

-- CHI_TIET_DON_HANG: 10 dong demo
INSERT INTO `CHI_TIET_DON_HANG` (`ma_chi_tiet_don`, `ma_don_hang`, `ma_bien_the`, `ten_san_pham_luu`, `ten_bien_the_luu`, `so_luong`, `don_gia`, `gia_tuy_chon`, `thanh_tien`, `tuy_chon_da_chon`)
VALUES
    (9001, 9001, 9002, 'Ca phe sua da', 'Size M', 2, 30000, 5000, 70000, '[{"ten":"50 phan tram","gia_them":0},{"ten":"Kem sua","gia_them":5000}]'),
    (9002, 9001, 9003, 'Americano', 'Size M', 1, 35000, 0, 35000, NULL),
    (9003, 9002, 9008, 'Robusta nguyen hat', 'Goi 500g', 1, 160000, 0, 160000, NULL),
    (9004, 9002, 9010, 'Arabica xay bot', 'Goi 250g', 1, 125000, 0, 125000, NULL),
    (9005, 9003, 9005, 'Bac xiu', 'Size M', 1, 32000, 0, 32000, NULL),
    (9006, 9004, 9006, 'Tra dao', 'Size M', 2, 30000, 0, 60000, NULL),
    (9007, 9005, 9004, 'Americano', 'Size L', 1, 42000, 0, 42000, NULL),
    (9008, 9005, 9001, 'Ca phe sua da', 'Size S', 1, 25000, 0, 25000, NULL),
    (9009, 9006, 9007, 'Robusta nguyen hat', 'Goi 250g', 1, 85000, 0, 85000, NULL),
    (9010, 9007, 9009, 'Arabica nguyen hat', 'Goi 250g', 1, 125000, 0, 125000, NULL)
ON DUPLICATE KEY UPDATE `ma_chi_tiet_don` = `ma_chi_tiet_don`;

-- THANH_TOAN: 7 dong demo
INSERT INTO `THANH_TOAN` (`ma_thanh_toan`, `ma_don_hang`, `phuong_thuc`, `trang_thai_thanh_toan`, `so_tien`, `ma_giao_dich_vnpay`, `ngay_thanh_toan`)
VALUES
    (9001, 9001, 'VNPAY', 'THANH_CONG', 109500, 'DEMO_VNPAY_9001', (NOW() - INTERVAL 2 DAY)),
    (9002, 9002, 'COD', 'CHUA_THANH_TOAN', 305000, NULL, NULL),
    (9003, 9003, 'TIEN_MAT', 'CHUA_THANH_TOAN', 32000, NULL, NULL),
    (9004, 9004, 'COD', 'CHUA_THANH_TOAN', 78000, NULL, NULL),
    (9005, 9005, 'TIEN_MAT', 'THANH_CONG', 67000, NULL, (NOW() - INTERVAL 1 DAY)),
    (9006, 9006, 'VNPAY', 'THAT_BAI', 100000, 'DEMO_FAIL_9006', NULL),
    (9007, 9007, 'VNPAY', 'THANH_CONG', 155000, 'DEMO_VNPAY_9007', NOW())
ON DUPLICATE KEY UPDATE `ma_thanh_toan` = `ma_thanh_toan`;

-- VAN_CHUYEN: 4 dong demo
INSERT INTO `VAN_CHUYEN` (`ma_van_chuyen`, `ma_don_hang`, `don_vi_van_chuyen`, `ma_van_don`, `trang_thai_giao`, `ngay_gui`, `ngay_giao_thanh_cong`)
VALUES
    (9001, 9001, 'Nhan vien giao noi thanh', 'DEMO-SHIP-9001', 'DA_GIAO', (NOW() - INTERVAL 2 DAY), (NOW() - INTERVAL 2 DAY)),
    (9002, 9002, 'Doi tac van chuyen demo', 'DEMO-SHIP-9002', 'DANG_GIAO', (NOW() - INTERVAL 1 DAY), NULL),
    (9003, 9004, NULL, NULL, 'CHO_GIAO', NULL, NULL),
    (9004, 9007, 'Doi tac van chuyen demo', NULL, 'CHO_GIAO', NULL, NULL)
ON DUPLICATE KEY UPDATE `ma_van_chuyen` = `ma_van_chuyen`;

-- DANH_GIA: 2 dong demo
INSERT INTO `DANH_GIA` (`ma_danh_gia`, `ma_nguoi_dung`, `ma_chi_tiet_don`, `so_sao`, `noi_dung`, `ngay_danh_gia`)
VALUES
    (9001, 9003, 9001, 5, 'Ca phe sua ngon, giao hang dung hen', (NOW() - INTERVAL 1 DAY)),
    (9002, 9004, 9007, 4, 'Americano vua vi, se ung ho tiep', NOW())
ON DUPLICATE KEY UPDATE `ma_danh_gia` = `ma_danh_gia`;
