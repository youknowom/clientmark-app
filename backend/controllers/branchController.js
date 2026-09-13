import mongoose from "mongoose";
import BranchModel from "../models/branchModel.js";
import UserModel from "../models/userModel.js";

//add branch
const addBranch = async (req, res) => {
  try {
    const { branchName, address, branchCode } = req.body;

    if (!branchName || branchName?.trim() === "") {
      return res
        .status(403)
        .json({ message: "Branch name is required.", success: false });
    }

    if (!branchCode || branchCode?.trim() === "") {
      return res
        .status(403)
        .json({ message: "Branch code is required.", success: false });
    }

    //check dublicate branch code
    const isDublicateBranchCode = await BranchModel.findOne({ branchCode });
    if (isDublicateBranchCode) {
      return res
        .status(400)
        .json({ message: "This branch code already exist.", success: false });
    }

    //check how many branches already added
    const noOfAlreadyAdded = await BranchModel.countDocuments();
    const branchLimit = process.env.BRANCH_LIMIT;

    if (noOfAlreadyAdded >= branchLimit) {
      return res.status(400).json({
        message: `Branch limit exceed. Your limit is ${branchLimit}.`,
        success: false,
      });
    }

    const newBranch = await BranchModel.create({
      branchName,
      address,
      branchCode,
    });

    return res
      .status(201)
      .json({ message: "Successfully save branch.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//update branch
const updateBranch = async (req, res) => {
  try {
    const { branchId, branchName, branchCode, address } = req.body;

    if (!branchName || branchName?.trim() === "") {
      return res
        .status(403)
        .json({ message: "Branch name is required.", success: false });
    }

    if (!branchCode || branchCode?.trim() === "") {
      return res
        .status(403)
        .json({ message: "Branch code is required.", success: false });
    }

    //check dublicate branch code
    const isDublicateBranchCode = await BranchModel.findOne({
      branchCode,
      _id: { $ne: branchId },
    });
    if (isDublicateBranchCode) {
      return res
        .status(400)
        .json({ message: "This branch code already exist.", success: false });
    }

    //find old branch details
    const branchDtl = await BranchModel.findOne({ _id: branchId });
    if (!branchDtl) {
      return res
        .status(400)
        .json({ message: "Branch old detail not found.", success: false });
    }

    const isUpdate = await BranchModel.updateOne(
      { _id: branchId },
      {
        $set: {
          branchName,
          address,
          branchCode,
        },
      }
    );

    if (isUpdate.modifiedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed to update branch details.", success: false });
    }

    return res
      .status(201)
      .json({ message: "Successfully update branch.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//get branches
const getBranches = async (req, res) => {
  try {
    let { search, branchId } = req.query;

    let filter = {};

    if (search && search?.trim() !== "") {
      filter.$or = [
        { branchName: { $regex: search, $options: "i" } },
        { branchCode: { $regex: search, $options: "i" } },
      ];
    }

    if (branchId) {
      filter._id = new mongoose.Types.ObjectId(branchId);
    }

    const branchList = await BranchModel.aggregate([
      { $match: filter },

      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "branchId",
          as: "employees",
        },
      },
      {
        $addFields: {
          employeeCount: { $size: "$employees" },
        },
      },
      {
        $project: {
          employees: 0,
        },
      },
      { $sort: { branchName: 1 } },
    ]);
    if (!branchList || branchList?.length === 0) {
      return res
        .status(400)
        .json({ message: "No branches found.", success: false });
    }

    return res.status(200).json({
      message: "Successfully get branches.",
      success: true,
      data: branchList,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//delete branch
const deleteBranch = async (req, res) => {
  try {
    let { branchId } = req.body;

    //check thit banch have user or not
    const userCount = await UserModel.countDocuments({ branchId: branchId });
    if (userCount > 0) {
      return res.status(400).json({
        message: `Can not delete. This branch have ${userCount} users.`,
        success: false,
      });
    }

    const isDelete = await BranchModel.deleteOne({ _id: branchId });
    if (isDelete.deletedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed to delete branch.", success: false });
    }

    return res
      .status(200)
      .json({ message: "Successfully delete branch.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};


export {
  addBranch,
  updateBranch,
  getBranches,
  deleteBranch,
};
