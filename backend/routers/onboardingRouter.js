import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import tenantMiddleware from "../middlewares/tenantMiddleware.js";
import {
  getOnboardingStatus,
  completeOnboarding,
  skipOnboarding,
} from "../controllers/onboardingController.js";

const onboardingRouter = express.Router();

// ── Protected Routes (Strictly Tenant Isolated) ──
onboardingRouter.use(authUser, tenantMiddleware);

onboardingRouter.get("/status", getOnboardingStatus);
onboardingRouter.post("/complete", completeOnboarding);
onboardingRouter.post("/skip", skipOnboarding);

export default onboardingRouter;
