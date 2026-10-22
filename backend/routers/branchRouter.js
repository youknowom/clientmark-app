import express from "express";
import { authUser, authAccess } from "../middlewares/authMiddleware.js";
import tenantMiddleware from "../middlewares/tenantMiddleware.js";
import { checkBranchLimit } from "../middlewares/usageLimitMiddleware.js";
import {
  addBranch,
  updateBranch,
  getBranches,
  deleteBranch,
} from "../controllers/branchController.js";

const branchRouter = express.Router();

// ── Protected Routes (Strictly Tenant Isolated) ──
branchRouter.use(authUser, tenantMiddleware);

branchRouter.post("/add-branch", authAccess("add:branch"), checkBranchLimit, addBranch);
branchRouter.put("/update-branch", authAccess("update:branch"), updateBranch);
branchRouter.get("/get-branches", authAccess("view:branch"), getBranches);
branchRouter.delete("/delete-branch", authAccess("delete:branch"), deleteBranch);

export default branchRouter;
