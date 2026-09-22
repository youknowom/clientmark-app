import express from "express";
import { authUser, authAccess } from "../middlewares/authMiddleware.js";
import { checkBranchLimit } from "../middlewares/usageLimitMiddleware.js";
import {
  addBranch,
  updateBranch,
  getBranches,
  deleteBranch,

} from "../controllers/branchController.js";

const branchRouter = express.Router();

branchRouter.post("/add-branch", authUser, authAccess("add:branch"), checkBranchLimit, addBranch); //add branch

branchRouter.put(
  "/update-branch",
  authUser,
  authAccess("update:branch"),
  updateBranch
); //update branch

branchRouter.get(
  "/get-branches",
  authUser,
  authAccess("view:branch"),
  getBranches
); //get branch list

branchRouter.delete(
  "/delete-branch",
  authUser,
  authAccess("delete:branch"),
  deleteBranch
); //delete branch



export default branchRouter;
