import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import tenantMiddleware from "../middlewares/tenantMiddleware.js";
import {
  registerTenant,
  getMyTenant,
  updateTenant,
} from "../controllers/tenantController.js";

const tenantRouter = express.Router();

// Public — registration
tenantRouter.post("/register", registerTenant);

// Protected — tenant management
tenantRouter.get("/my-tenant", authUser, tenantMiddleware, getMyTenant);
tenantRouter.put("/update", authUser, tenantMiddleware, updateTenant);

export default tenantRouter;
