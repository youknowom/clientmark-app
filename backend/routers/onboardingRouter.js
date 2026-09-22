import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import {
  getOnboardingStatus,
  completeOnboarding,
  skipOnboarding,
} from "../controllers/onboardingController.js";

const onboardingRouter = express.Router();

onboardingRouter.get("/status", authUser, getOnboardingStatus);
onboardingRouter.post("/complete", authUser, completeOnboarding);
onboardingRouter.post("/skip", authUser, skipOnboarding);

export default onboardingRouter;
