import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import tenantMiddleware from "../middlewares/tenantMiddleware.js";
import {
  getPlans,
  getMyPlan,
  getUsage,
  upgradePlan,
} from "../controllers/subscriptionController.js";

const subscriptionRouter = express.Router();

// Public — list all plans
subscriptionRouter.get("/plans", getPlans);

// Protected — subscription management
subscriptionRouter.get("/my-plan", authUser, tenantMiddleware, getMyPlan);
subscriptionRouter.get("/usage", authUser, tenantMiddleware, getUsage);
subscriptionRouter.post("/upgrade", authUser, tenantMiddleware, upgradePlan);

export default subscriptionRouter;
