"use strict";
const express = require("express"),
  auth = require("../middlewares/authMiddleware"),
  roles = require("../middlewares/roleMiddleware"),
  c = require("../controllers/promotionController");
const r = express.Router();
r.use(auth, roles("ADMIN"));
r.get("/", c.list);
r.post("/", c.create);
r.patch("/:id", c.patch);
module.exports = r;
