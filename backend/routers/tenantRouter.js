import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import tenantMiddleware from "../middlewares/tenantMiddleware.js";
import {
  registerTenant,
  getMyTenant,
  updateTenant,
  getDemoSession,
} from "../controllers/tenantController.js";

const tenantRouter = express.Router();

// Public — registration & 1-click sandbox demo
tenantRouter.post("/register", registerTenant);
tenantRouter.post("/demo-login", getDemoSession);

// ── Protected Routes (Strictly Tenant Isolated) ──
tenantRouter.use(authUser, tenantMiddleware);

tenantRouter.get("/my-tenant", getMyTenant);
tenantRouter.put("/update", updateTenant);

export default tenantRouter;
