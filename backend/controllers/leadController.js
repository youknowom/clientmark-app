import LeadModel from "../models/leadModel.js";
import UserModel from "../models/userModel.js";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { formatDateTime } from "../services/dateService.js";
import LeadHistoryModel from "../models/leadHistoryModel.js";
import mongoose from "mongoose";
import RoleModel from "../models/roleModel.js";
import { createBulkNotification } from "../utils/notificationUtil.js";
import NotificationModel from "../models/notificationModel.js";
import WhatsappTemplateModel from "../models/whatsappTemplateModel.js";
import WhatsappChatModel from "../models/whatsappChatModel.js";
import { sendWATextServ } from "../services/whatsappService.js";

// Create a Lead
const createLead = async (req, res) => {
  try {
    //login user id
    const userId = req.user._id;
    const {
      fullName,
      mobileNo,
      whatsappNo,
      email,
      gender,
      country,
      state,
      city,
      address,
      businessName,
      serviceRequirement,
      remark,
    } = req.body;

    if (!fullName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    const mobile = String(mobileNo || "").trim();

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    //find that user name
    const userDtl = await UserModel.findOne({ _id: userId, status: "Active" });
    if (!userDtl) {
      return res.status(400).json({
        message: "You have no permission to add lead.",
        success: false,
      });
    }

    const tenantId = req.user?.tenantId || req.tenantId;

    //find last index number
    const lastRecord = await LeadModel.findOne(
      tenantId ? { tenantId } : {}
    ).sort({ currentIndex: -1 });
    let currentIndex = lastRecord ? (lastRecord.currentIndex || 0) + 1 : 1;

    //current year
    let currentYear = new Date().getFullYear().toString().slice(-2);

    const paddedSerial = String(currentIndex).padStart(6, "0");
    let leadNo = `S${process.env.FORMAT}/${currentYear}/${paddedSerial}`;

    const newLead = new LeadModel({
      tenantId,
      leadNo,
      fullName,
      mobileNo,
      whatsappNo,
      email,
      gender,
      country,
      state,
      city,
      address,
      businessName,
      serviceRequirement,
      leadStage: "NEW",
      callStatus: "PENDING",
      leadStatus: "NEW",
      remark,
      currentIndex,
      addById: userDtl ? userDtl._id : null,
    });

    await newLead.save();

    const io = req.app.get("io");
    io.emit("create-lead");

    return res.status(201).json({
      success: true,
      message: "Successfully add lead.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all leads (with pagination, filters, search)
const getLeads = async (req, res) => {
  try {
    const loginUserId = req?.user?._id;
    const role = req?.user?.roleId?.roleName;

    let {
      page = 1,
      limit = 100,
      search,
      fromDate,
      toDate,
      leadStatus,
      leadStage,
      callStatus,
    } = req.query;

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.max(1, parseInt(limit, 10) || 100);

    const filter = {};
    const tenantId = req.user?.tenantId || req.tenantId;
    if (tenantId) {
      filter.tenantId = tenantId;
    }

    // Role-based filtering
    if (role === "TeleCaller") {
      filter.assignedToTelecaller = loginUserId;
    } else if (role === "BDE") {
      filter.assignedToBDE = loginUserId;
    } else if (role === "Developer") {
      // Developers should not see leads in this system
      // Return empty result for Developer role
      return res.status(200).json({
        message: "No leads found for your role.",
        success: true,
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
        },
      });
    }
    // Admin and Manager roles see all leads (no filter applied)

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { fullName: regex },
        { mobileNo: regex },
        { whatsappNo: regex },
        { email: regex },
        { leadNo: regex },
      ];
    }

    // ===== DATE FILTER =====
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // ===== OTHER FILTERS =====
    if (leadStatus) filter.leadStatus = leadStatus;
    if (leadStage) filter.leadStage = leadStage;
    if (callStatus) filter.callStatus = callStatus;

    const skip = (page - 1) * limit;
    const sort = { updatedAt: -1 };

    // ===== PARALLEL EXECUTION =====
    const [total, leadDtl] = await Promise.all([
      LeadModel.countDocuments(filter),
      LeadModel.find(filter)
        .populate("addById")
        .populate("assignedToBDE")
        .populate("assignedToTelecaller")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    if (!leadDtl.length) {
      return res.status(400).json({
        message: "No leads found.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Successfully get leads.",
      success: true,
      data: leadDtl,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// Get a single lead by ID
const getLeadById = async (req, res) => {
  try {
    const lead = await LeadModel.findById(req.params.id);
    if (!lead) {
      return res
        .status(404)
        .json({ message: "Lead not found", success: false });
    }
    return res.status(200).json({
      message: "Lead fetched successfully",
      success: true,
      data: lead,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// Update a lead by ID
const updateLead = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      fullName,
      mobileNo,
      whatsappNo,
      email,
      gender,
      country,
      state,
      city,
      address,
      businessName,
      serviceRequirement,
      remark,
    } = req.body;

    let leadId = req.body._id;

    if (!fullName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    const mobile = String(mobileNo || "").trim();

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    //find that user name
    const userDtl = await UserModel.findOne({ _id: userId, status: "Active" });
    if (!userDtl) {
      return res.status(400).json({
        message: "You have no permission to uodate lead.",
        success: false,
      });
    }

    const isUpdate = await LeadModel.updateOne(
      { _id: leadId },
      {
        fullName,
        mobileNo,
        whatsappNo,
        email,
        gender,
        country,
        state,
        city,
        address,
        businessName,
        serviceRequirement,
        remark,
        updateById: userDtl ? userDtl._id : null,
      },
    );

    if (isUpdate.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to update lead",
      });
    }

    const io = req.app.get("io");
    io.emit("update-lead");

    return res.status(200).json({
      success: true,
      message: "Successfully update lead",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a lead by ID
const deleteLead = async (req, res) => {
  try {
    const deletedLead = await LeadModel.findByIdAndDelete(req.params.id);
    if (!deletedLead) {
      return res
        .status(404)
        .json({ message: "Lead not found", success: false });
    }

    const io = req.app.get("io");
    io.emit("delete-lead");

    return res
      .status(200)
      .json({ message: "Lead deleted successfully", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//delete selected selller lead
const deleteManyLead = async (req, res) => {
  try {
    const { selectedLead } = req.body;
    if (!Array.isArray(selectedLead) || selectedLead.length === 0) {
      return res
        .status(400)
        .json({ message: "No leads selected", success: false });
    }

    //find deletable leads
    const deletableLeads = await LeadModel.find({
      _id: { $in: selectedLead },
      leadStage: "NEW",
    }).select("_id");

    const deletableIds = deletableLeads.map((l) => l._id.toString());

    const deleteResult = await LeadModel.deleteMany({
      _id: { $in: deletableIds },
    });

    const failedIds = selectedLead.filter(
      (id) => !deletableIds.includes(id.toString()),
    );

    const io = req.app.get("io");
    if (deleteResult.deletedCount > 0) io.emit("delete-lead");

    return res.status(200).json({
      message: `${deleteResult.deletedCount} lead(s) deleted successfully`,
      failedIds: failedIds,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//import seller lead
const importLead = async (req, res) => {
  try {
    //extract user who add this lead
    const userId = req.user._id;

    //find that user name
    const userDtl = await UserModel.findOne({ _id: userId, status: "Active" });

    if (!userDtl) {
      return res
        .status(400)
        .json({ message: "You have no access to add lead.", success: false });
    }

    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ message: "Please provide excel file.", success: false });
    }

    //find last index number
    const lastRecord = await LeadModel.findOne().sort({ currentIndex: -1 });
    let currentIndex = lastRecord ? lastRecord.currentIndex || 0 : 0;

    //current year
    let currentYear = new Date().getFullYear().toString().slice(-2);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file.path);

    const worksheet = workbook.getWorksheet(1);
    const leads = [];

    let counter = 1;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const index = currentIndex + counter;
      const paddedSerial = String(index).padStart(6, "0");
      let leadNo = `S${process.env.FORMAT}/${currentYear}/${paddedSerial}`;

      let [
        fullName,
        mobileNo,
        whatsappNo,
        email,
        gender,
        country,
        state,
        city,
        address,
        businessName,
        serviceRequirement,
        remark,
      ] = row.values.slice(1);

      if (email.text) {
        email = email.text;
      } else {
        email = email;
      }

      leads.push({
        tenantId: req.user?.tenantId || req.tenantId,
        leadNo,
        fullName,
        mobileNo: mobileNo?.toString(),
        whatsappNo: whatsappNo?.toString(),
        email: email?.toString(),
        gender,
        country,
        state,
        address,
        city,
        businessName,
        serviceRequirement,
        remark,
        addById: userDtl._id,
        currentIndex: index,
      });

      counter++;
    });

    if (!leads.length) {
      return res
        .status(400)
        .json({ message: "No valid data found", success: false });
    }

    let insertedCount = 0;

    try {
      const result = await LeadModel.insertMany(leads, { ordered: false });
      insertedCount = result.length;
    } catch (error) {
      if (error.insertedDocs) {
        insertedCount = error.insertedDocs.length;
      } else if (error.result?.nInserted) {
        insertedCount = error.result.nInserted;
      }
    }

    //delete excel file from temp
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {}

    const io = req.app.get("io");
    if (insertedCount > 0) io.emit("create-lead");

    return res.status(201).json({
      message: `Successfully imported ${insertedCount} leads.`,
      totalRows: leads.length,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//export leads
const exportLead = async (req, res) => {
  try {
    let { search, fromDate, toDate, leadStatus, leadStage, callStatus } =
      req.query;

    const filter = {};
    const tenantId = req.user?.tenantId || req.tenantId;
    if (tenantId) {
      filter.tenantId = tenantId;
    }

    // ===== SEARCH FILTER =====
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { fullName: regex },
        { mobileNo: regex },
        { whatsappNo: regex },
        { email: regex },
        { leadNo: regex },
      ];
    }

    // ===== DATE FILTER =====
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // ===== OTHER FILTERS =====
    if (leadStatus) filter.leadStatus = leadStatus;
    if (leadStage) filter.leadStage = leadStage;
    if (callStatus) filter.callStatus = callStatus;

    const sort = { createdAt: -1 };

    // ===== PARALLEL EXECUTION =====
    const [leadDtl] = await Promise.all([
      LeadModel.find(filter).populate("addById").sort(sort).lean(),
    ]);

    if (!leadDtl.length) {
      return res.status(400).json({
        message: "No leads found.",
        success: false,
      });
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Lead");

    // Define columns
    worksheet.columns = [
      { header: "Sr_No", key: "srNo", width: 8 },
      { header: "Lead No", key: "leadNo", width: 15 },
      { header: "Customer Name", key: "fullName", width: 35 },
      { header: "Mobile", key: "mobileNo", width: 20 },
      { header: "Lead Stage", key: "leadStage", width: 20 },
      { header: "Call Status", key: "callStatus", width: 20 },
      { header: "Lead Status", key: "leadStatus", width: 20 },
      { header: "WhatsApp", key: "whatsappNo", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Gender", key: "gender", width: 15 },
      { header: "Country", key: "country", width: 15 },
      { header: "State", key: "state", width: 15 },
      { header: "City", key: "city", width: 15 },
      { header: "Address", key: "address", width: 15 },
      { header: "Business Name", key: "businessName", width: 15 },
      { header: "Service Requirement", key: "serviceRequirement", width: 30 },
      { header: "Remark", key: "remark", width: 15 },
      { header: "Add By", key: "addById", width: 15 },
      { header: "Add Date", key: "createdAt", width: 15 },
    ];

    leadDtl.forEach((item, idx) => {
      worksheet.addRow({
        srNo: idx + 1,
        leadNo: item.leadNo || "-",
        fullName: item.fullName || "-",
        mobileNo: item.mobileNo || "-",
        leadStage: item.leadStage || "-",
        callStatus: item.callStatus || "-",
        leadStatus: item.leadStatus || "-",
        whatsappNo: item.whatsappNo || "-",
        email: item.email || "-",
        gender: item.gender || "-",
        country: item.country || "-",
        state: item.state || "-",
        city: item.city || "-",
        address: item.address || "-",
        businessName: item.businessName || "-",
        serviceRequirement: item.serviceRequirement || "-",
        remark: item.remark || "-",
        createdAt: formatDateTime(item.createdAt),
        addById: item.addById.fullName || "-",
      });
    });

    // ===== Send File as Response =====
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=Leads.xlsx");

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//download seller sample
const downSample = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Lead");

    // Define columns
    worksheet.columns = [
      { header: "Full_Name", key: "fullName", width: 20 },
      { header: "Mobile", key: "mobileNo", width: 20 },
      { header: "WhatsApp", key: "whatsappNo", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Gender", key: "gender", width: 15 }, // <-- Dropdown here
      { header: "Country", key: "country", width: 15 },
      { header: "State", key: "state", width: 15 },
      { header: "City", key: "city", width: 15 },
      { header: "Address", key: "address", width: 15 },
      { header: "Business Name", key: "businessName", width: 15 },
      { header: "Service Requirement", key: "serviceRequirement", width: 30 },
      { header: "Remark", key: "remark", width: 15 },
    ];

    // ===== Add Dropdown Validation for Gender Column =====
    const totalRows = 500;
    // Gender
    const genderOptions = ["Male", "Female", "Other"];
    for (let row = 2; row <= totalRows; row++) {
      worksheet.getCell(`E${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${genderOptions.join(",")}"`],
        showErrorMessage: true,
        errorTitle: "Invalid Gender",
        error: "Please select a valid gender from the dropdown",
      };
    }

    // ===== Send File as Response =====
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=Leads.xlsx");

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//common function for - assign lead to telecaller by Admin
const adminToTelecaller = async (leadIds, assignToId, assignById) => {
  try {
    const results = [];
    const updateOps = [];

    // convert ids to ObjectId
    const objectIds = leadIds.map((item) => new mongoose.Types.ObjectId(item));

    // fetch leads + telecaller
    const [leads, telecaller] = await Promise.all([
      LeadModel.find({ _id: { $in: objectIds } }),
      UserModel.findOne({ _id: assignToId, status: "Active" }),
    ]);

    if (!telecaller) {
      throw new Error("Telecaller not found or inactive");
    }

    // create map for quick lookup
    const leadMap = new Map(leads.map((item) => [item._id.toString(), item]));

    // process each lead
    for (const id of leadIds) {
      const lead = leadMap.get(id.toString());

      // lead not found
      if (!lead) {
        results.push({
          _id: id,
          leadNo: "-",
          status: "Failed",
          reason: "Lead not found.",
        });
        continue;
      }

      // already assigned
      if (lead.leadStage !== "NEW") {
        results.push({
          _id: id,
          leadNo: lead.leadNo,
          status: "Failed",
          reason: "Lead already assigned",
        });
        continue;
      }

      // prepare bulk update
      updateOps.push({
        updateOne: {
          filter: { _id: id },
          update: {
            $set: {
              assignedToTelecaller: assignToId,
              assignedToBDE: telecaller.reportToId || null,
              leadStage: "TELECALLING",
              updateById: assignById,
              leadStatus: "ASSIGNED_TO_TELECALLER",
            },
          },
        },
      });

      // push success result
      results.push({
        _id: id,
        leadNo: lead.leadNo,
        status: "Success",
        reason: "Successfully Assigned",
      });
    }

    // run bulk update
    if (updateOps.length > 0) {
      await LeadModel.bulkWrite(updateOps);
    }

    const successLeadIds = results
      .filter((item) => item.status === "Success")
      .map((item) => item._id);

    //create history
    const histories = successLeadIds.map((id) => ({
      leadId: new mongoose.Types.ObjectId(id),
      assignToId: new mongoose.Types.ObjectId(assignToId),
      assignById: new mongoose.Types.ObjectId(assignById),
    }));

    //create notifications
    const notifications = successLeadIds.map((id) => ({
      userId: assignToId,
      notificationType: "lead",
      title: "Lead Assign",
      message: "Admin have assigned lead.",
      redirectUrl: "/all-lead",
      isRead: false,
    }));

    try {
      await LeadHistoryModel.insertMany(histories);
    } catch (error) {}

    try {
      await NotificationModel.insertMany(notifications);
    } catch (error) {}

    return results;
  } catch (error) {
    throw new Error(error.message);
  }
};

//assing many lead - admin to telecaller
const manyAdminToTelecaller = async (req, res) => {
  try {
    const assignById = req.user._id;
    const { leadIds, assignToId } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json({ message: "No lead selected.", success: false });
    }

    if (!assignToId) {
      return res
        .status(400)
        .json({ message: "No telecaller selected.", success: false });
    }

    const result = await adminToTelecaller(leadIds, assignToId, assignById);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Assignment");

    worksheet.columns = [
      { header: "Sr", key: "srNo", width: 10 },
      { header: "Lead No", key: "leadNo", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Reason", key: "reason", width: 30 },
    ];

    result.forEach((item, idx) => {
      worksheet.addRow({
        srNo: idx + 1,
        leadNo: item.leadNo,
        status: item.status === "Success" ? "Success" : "Failed",
        reason: item.reason,
      });
    });

    let message = `${
      result.filter((r) => r.status === "Success").length
    } lead(s) Assigned, ${result.filter((r) => r.status === "Failed").length} lead(s) Failed`;

    const io = req.app.get("io");
    io.emit("many-admin-to-telecaller");

    // ===== Send File as Response =====
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Assignment.xlsx",
    );

    // custom message header
    res.setHeader("X-Message", message);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//assign many lead Telecaller to BDE
const manyTelecallerToBde = async (req, res) => {
  try {
    const { leadIds, callStatus } = req.body;
    const loginUserId = req.user._id;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json({ message: "No lead selected.", success: false });
    }

    if (!callStatus) {
      return res
        .status(400)
        .json({ message: "Select call status.", success: false });
    }

    const results = [];
    const updateOpt = [];

    // convert id into ObjectId
    const objectIds = leadIds.map((item) => new mongoose.Types.ObjectId(item));

    // find only leads that will be updated
    const leadsDetail = await LeadModel.find({
      _id: { $in: objectIds },
    }).lean();

    //create map for quick lookup
    const leadMap = new Map(
      leadsDetail.map((item) => [item._id.toString(), item]),
    );

    //process each leads
    for (const id of leadIds) {
      const lead = leadMap.get(id.toString());

      if (!lead) {
        results.push({
          _id: id,
          leadNo: "-",
          status: "Failed",
          reason: "Lead not found.",
          assignToId: null,
        });
        continue;
      }

      //check lead leadStage is 'TELECALLING' or not
      if (lead.leadStage !== "TELECALLING") {
        results.push({
          _id: id,
          leadNo: lead.leadNo,
          status: "Failed",
          reason: "Unassign to TC or already assign to BDE.",
          assignToId: lead.assignedToBDE,
        });
        continue;
      }

      //prepare bulk update
      updateOpt.push({
        updateOne: {
          filter: { _id: lead._id },
          update: {
            $set: {
              leadStage: "SALES",
              callStatus: callStatus,
              leadStatus: "ASSIGNED_TO_BDE",
              updateById: loginUserId,
            },
          },
        },
      });

      results.push({
        _id: id,
        leadNo: lead.leadNo,
        status: "Success",
        reason: "Successfully Assigned",
        assignToId: lead.assignedToBDE,
      });
    }

    //run bulk update
    if (updateOpt.length > 0) {
      await LeadModel.bulkWrite(updateOpt);
    }

    const successLeadIds = results
      .filter((item) => item.status === "Success")
      .map((item) => ({
        _id: item._id,
        assignToId: item.assignToId,
      }));

    //create history record
    const histories = successLeadIds.map((item) => ({
      leadId: new mongoose.Types.ObjectId(item._id),
      assignToId: item.assignToId
        ? new mongoose.Types.ObjectId(item.assignToId)
        : null,
      assignById: new mongoose.Types.ObjectId(loginUserId),
    }));

    //create notification record
    const notifications = successLeadIds.map((item) => ({
      userId: item.assignToId,
      notificationType: "lead",
      title: "Lead Completed",
      message: "Telecaller have completed some leads.",
      redirectUrl: "/all-lead",
      isRead: false,
    }));

    if (histories.length > 0) {
      await LeadHistoryModel.insertMany(histories);
    }

    //create notification
    await createBulkNotification(notifications);

    //create excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("TelecallerToBde");

    worksheet.columns = [
      { header: "Sr", key: "srNo", width: 10 },
      { header: "Lead No", key: "leadNo", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Reason", key: "reason", width: 30 },
    ];

    results.forEach((item, idx) => {
      worksheet.addRow({
        srNo: idx + 1,
        leadNo: item.leadNo,
        status: item.status === "Success" ? "Success" : "Failed",
        reason: item.reason,
      });
    });

    const io = req.app.get("io");
    io.emit("many-telecaller-to-bde");

    // ===== Send File as Response =====
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=TelecallerToBde.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      success: false,
    });
  }
};

//get single lead progress
const getLeadProgess = async (req, res) => {
  try {
    const { leadId } = req.query;

    //find lead details
    const leadDetails = await LeadModel.findOne({ _id: leadId })
      .populate("assignedToBDE")
      .populate("assignedToTelecaller");

    if (!leadDetails) {
      return res
        .status(400)
        .json({ message: "Lead details not found.", success: false });
    }

    //find lead progress
    const leadProgress = await LeadHistoryModel.find({ leadId: leadId })
      .sort({ createdAt: 1 })
      .populate("assignToId")
      .populate("assignById");

    return res.status(200).json({
      message: "Successfully get lead progress.",
      success: true,
      leadProgress: leadProgress || [],
      leadDetails: leadDetails,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//assign many lead bde to admin
const manyBdeToAdmin = async (req, res) => {
  try {
    const assignById = req.user._id;
    const { leadIds, leadStatus } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json({ message: "No lead selected.", success: false });
    }

    if (!leadStatus) {
      return res
        .status(400)
        .json({ message: "Select lead status.", success: false });
    }

    //find admin detials
    const adminRole = await RoleModel.findOne({ roleName: "Admin" });
    const adminDetail = await UserModel.findOne({ roleId: adminRole._id });
    if (!adminDetail) {
      return res
        .status(400)
        .json({ message: "Admin detail not found.", success: false });
    }
    let assignToId = adminDetail._id;

    const results = [];
    const updateOpt = [];

    // convert id into ObjectId
    const objectIds = leadIds.map((item) => new mongoose.Types.ObjectId(item));

    // find only leads that will be updated
    const leadsDetail = await LeadModel.find({
      _id: { $in: objectIds },
    }).lean();

    //create map for quick lookup
    const leadMap = new Map(
      leadsDetail.map((item) => [item._id.toString(), item]),
    );

    //process each leads
    for (const id of leadIds) {
      const lead = leadMap.get(id.toString());

      //chekc lead detail exist or not
      if (!lead) {
        results.push({
          _id: id,
          leadNo: "-",
          status: "Failed",
          reason: "Lead not found.",
        });
        continue;
      }

      //check lead leadStage is 'SALES' or not
      if (lead.leadStage !== "SALES") {
        results.push({
          _id: id,
          leadNo: lead.leadNo,
          status: "Failed",
          reason: "Lead is not assign to bde yet.",
        });
        continue;
      }

      //prepare bulk update
      updateOpt.push({
        updateOne: {
          filter: { _id: lead._id },
          update: {
            $set: {
              leadStage: "CLOSED",
              leadStatus: leadStatus,
              updateById: assignById,
            },
          },
        },
      });

      results.push({
        _id: id,
        leadNo: lead.leadNo,
        status: "Success",
        reason: "Successfully Assigned",
      });
    }

    //run bulk update
    if (updateOpt.length > 0) {
      await LeadModel.bulkWrite(updateOpt);
    }

    //filter success lead and prepare object
    const successLeadIds = results
      .filter((item) => item.status === "Success")
      .map((item) => item._id);

    const histories = successLeadIds.map((id) => ({
      leadId: new mongoose.Types.ObjectId(id),
      assignToId: new mongoose.Types.ObjectId(assignToId),
      assignById: new mongoose.Types.ObjectId(assignById),
    }));

    try {
      await LeadHistoryModel.insertMany(histories);
    } catch (error) {}

    //create notification
    const notifications = successLeadIds.map((id) => ({
      userId: assignToId,
      notificationType: "lead",
      title: "Lead Closed",
      message: "BDE have completed and close lead.",
      redirectUrl: "/all-lead",
      isRead: false,
    }));

    try {
      await NotificationModel.insertMany(notifications);
    } catch (error) {}

    //create excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("BdeToAdmin");

    worksheet.columns = [
      { header: "Sr", key: "srNo", width: 10 },
      { header: "Lead No", key: "leadNo", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Reason", key: "reason", width: 30 },
    ];

    results.forEach((item, idx) => {
      worksheet.addRow({
        srNo: idx + 1,
        leadNo: item.leadNo,
        status: item.status === "Success" ? "Success" : "Failed",
        reason: item.reason,
      });
    });

    const io = req.app.get("io");
    io.emit("many-bde-to-admin");

    // ===== Send File as Response =====
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=BdeToAdmin.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const singleTelecallerToBde = async (req, res) => {
  try {
    const { callStatus, leadId } = req.body;
    const loginUserId = req.user._id;

    if (!leadId) {
      return res
        .status(400)
        .json({ message: "Lead id is missing.", success: false });
    }

    if (!callStatus) {
      return res
        .status(400)
        .json({ message: "Select call status.", success: false });
    }

    //find lead
    const leadDetail = await LeadModel.findOne({ _id: leadId });
    if (!leadDetail) {
      return res
        .status(400)
        .json({ message: "Lead detail not found.", success: false });
    }

    //check lead status already assing or not
    if (leadDetail.leadStage !== "TELECALLING") {
      return res.status(400).json({
        message: "Unassign to TC or already assign to BDE",
        success: false,
      });
    }

    //update lead
    const isUpdate = await LeadModel.updateOne(
      { _id: leadId },
      {
        $set: {
          leadStage: "SALES",
          callStatus: callStatus,
          leadStatus: "ASSIGNED_TO_BDE",
          updateById: loginUserId,
        },
      },
    );

    if (isUpdate.modifiedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed to assign lead.", success: false });
    }

    const io = req.app.get("io");
    io.emit("single-telecaller-to-bde");

    //create history
    try {
      await LeadHistoryModel.create({
        leadId: new mongoose.Types.ObjectId(leadId),
        assignToId: new mongoose.Types.ObjectId(leadDetail.assignedToBDE),
        assignById: new mongoose.Types.ObjectId(loginUserId),
      });
    } catch (error) {}

    try {
      await NotificationModel.create({
        userId: leadDetail.assignedToBDE,
        notificationType: "lead",
        title: "Lead Assign",
        message: "Telecaller have completed lead.",
        redirectUrl: "/all-lead",
        isRead: false,
      });
    } catch (error) {}

    return res
      .status(200)
      .json({ message: "Successfully assign lead.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//get telecaller lead reprot
const getTelecallerLeadReport = async (req, res) => {
  try {
    const loginUser = req.user;
    const loginUserRole = loginUser.roleId.roleName;
    const loginUserId = loginUser._id;
    const { branchId, fromDate, toDate, search } = req.query;

    let userFilter = {};

    //apply filter base on role
    if (loginUserRole === "TeleCaller") {
      userFilter._id = loginUserId;
    } else if (loginUserRole === "BDE") {
      userFilter.reportToId = loginUserId;
    }

    if (search) {
      userFilter.$or = [{ fullName: { $regex: search, $options: "i" } }];
    }

    if (branchId) {
      userFilter.branchId = branchId;
    }

    // find telecaller role id
    const telecallerRole = await RoleModel.findOne({
      roleName: "TeleCaller",
    }).select("_id");

    if (!telecallerRole) {
      return res
        .status(400)
        .json({ message: "Telecaller role not found", success: false });
    }

    userFilter.roleId = telecallerRole._id;

    const telecallers = await UserModel.find(userFilter)
      .populate("branchId")
      .select("_id fullName mobileNo branchId");

    if (!telecallers.length) {
      return res
        .status(400)
        .json({ message: "Telecaller not exist.", success: false });
    }

    // Date filter
    let leadDateFilter = {};
    if (fromDate || toDate) {
      leadDateFilter.createdAt = {};
      if (fromDate) leadDateFilter.createdAt.$gte = new Date(fromDate);

      if (toDate) {
        let adjustedDate = new Date(toDate);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        leadDateFilter.createdAt.$lte = adjustedDate;
      }
    }

    // Aggregate leads
    const leadStats = await LeadModel.aggregate([
      {
        $match: {
          ...leadDateFilter,
        },
      },
      {
        $group: {
          _id: "$assignedToTelecaller",
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $in: ["$leadStage", ["SALES", "CLOSED"]] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$leadStage", "TELECALLING"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // sonvert stats to map
    const statsMap = {};
    leadStats.forEach((item) => {
      statsMap[item._id?.toString()] = item;
    });

    // merge telecaller + stats
    const result = telecallers.map((user) => {
      const stats = statsMap[user._id.toString()] || {
        total: 0,
        completed: 0,
        pending: 0,
      };

      return {
        telecallerId: user._id,
        fullName: user.fullName,
        branchName: user.branchId.branchName,
        mobileNo: user.mobileNo,
        totalLeads: stats.total,
        completedLeads: stats.completed,
        pendingLeads: stats.pending,
      };
    });

    return res.status(200).json({
      message: "Successfully get report.",
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//export telecaller lead report
const exportTelecallerLeadReport = async (req, res) => {
  try {
    const loginUser = req.user;
    const loginUserRole = loginUser.roleId.roleName;
    const loginUserId = loginUser._id;

    const { branchId, fromDate, toDate, search } = req.query;

    let userFilter = {};

    //apply filter base on role
    if (loginUserRole === "TeleCaller") {
      userFilter._id = loginUserId;
    } else if (loginUserRole === "BDE") {
      userFilter.reportToId = loginUserId;
    }

    if (search) {
      userFilter.$or = [{ fullName: { $regex: search, $options: "i" } }];
    }

    if (branchId) {
      userFilter.branchId = branchId;
    }

    // find telecaller role id
    const telecallerRole = await RoleModel.findOne({
      roleName: "TeleCaller",
    }).select("_id");

    if (!telecallerRole) {
      return res
        .status(400)
        .json({ message: "Telecaller role not found", success: false });
    }

    userFilter.roleId = telecallerRole._id;

    const telecallers = await UserModel.find(userFilter)
      .populate("branchId")
      .select("_id fullName mobileNo branchId");

    if (!telecallers.length) {
      return res
        .status(400)
        .json({ message: "Telecaller not exist.", success: false });
    }

    //date filter for lead
    let leadDateFilter = {};
    if (fromDate || toDate) {
      leadDateFilter.createdAt = {};
      if (fromDate) leadDateFilter.createdAt.$gte = new Date(fromDate);

      if (toDate) {
        let adjustedDate = new Date(toDate);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        leadDateFilter.createdAt.$lte = adjustedDate;
      }
    }

    //aggregate leads
    const leadStats = await LeadModel.aggregate([
      {
        $match: {
          ...leadDateFilter,
        },
      },
      {
        $group: {
          _id: "$assignedToTelecaller",
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $in: ["$leadStage", ["SALES", "CLOSED"]] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$leadStage", "TELECALLING"] }, 1, 0],
            },
          },
        },
      },
    ]);

    //convert stats to map
    const statsMap = {};
    leadStats.forEach((item) => {
      statsMap[item._id?.toString()] = item;
    });

    //merge telecaller + stats
    const result = telecallers.map((user) => {
      const stats = statsMap[user._id.toString()] || {
        total: 0,
        completed: 0,
        pending: 0,
      };

      return {
        telecallerId: user._id,
        fullName: user.fullName,
        branchName: user.branchId.branchName,
        mobileNo: user.mobileNo,
        totalLeads: stats.total,
        completedLeads: stats.completed,
        pendingLeads: stats.pending,
      };
    });

    //create excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Telecaller_Lead_Report");

    worksheet.columns = [
      { header: "Sr", key: "srNo", width: 10 },
      { header: "Telecaller", key: "fullName", width: 35 },
      { header: "Branch", key: "branchName", width: 25 },
      { header: "Total", key: "totalLeads", width: 10 },
      { header: "Completed", key: "completedLeads", width: 10 },
      { header: "Pending", key: "pendingLeads", width: 10 },
    ];

    result.forEach((item, idx) => {
      worksheet.addRow({
        srNo: idx + 1,
        fullName: item.fullName,
        branchName: item.branchName,
        totalLeads: item.totalLeads,
        completedLeads: item.completedLeads,
        pendingLeads: item.pendingLeads,
      });
    });

    //send file as response
    res.attachment("TelecallerLeadReport.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//get bde lead report
const getBdeLeadReport = async (req, res) => {
  try {
    const loginUser = req.user;
    const loginUserId = loginUser._id;
    const loginUserRole = loginUser.roleId.roleName;
    const { branchId, fromDate, toDate, search } = req.query;

    let userFilter = {};

    if (branchId) {
      userFilter.branchId = branchId;
    }

    if (search) {
      userFilter.$or = [{ fullName: { $regex: search, $options: "i" } }];
    }

    if (loginUserRole === "BDE") {
      userFilter._id = loginUserId;
    }

    //first find id of role 'BDE'
    const bdeRole = await RoleModel.findOne({ roleName: "BDE" }).select("_id");
    if (!bdeRole) {
      return res
        .status(400)
        .json({ message: "BDE role not found.", success: false });
    }

    userFilter.roleId = bdeRole._id;

    //find bde
    const executivies = await UserModel.find(userFilter)
      .populate("branchId")
      .select("_id fullName mobileNo branchId");

    if (executivies.length === 0) {
      return res
        .status(400)
        .json({ message: "BDE not exist.", success: false });
    }

    //date filter for lead
    let leadDateFilter = {};
    if (fromDate || toDate) {
      leadDateFilter.createdAt = {};
      if (fromDate) leadDateFilter.createdAt.$gte = new Date(fromDate);

      if (toDate) {
        let adjustedDate = new Date(toDate);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        leadDateFilter.createdAt.$lte = adjustedDate;
      }
    }

    //aggregate lead
    const leadStats = await LeadModel.aggregate([
      {
        $match: {
          ...leadDateFilter,
        },
      },
      {
        $group: {
          _id: "$assignedToBDE",
          total: {
            $sum: {
              $cond: [{ $in: ["$leadStage", ["SALES", "CLOSED"]] }, 1, 0],
            },
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$leadStage", "CLOSED"] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$leadStage", "SALES"] }, 1, 0],
            },
          },
        },
      },
    ]);

    //convert stats to map
    const statsMap = {};
    leadStats.forEach((item) => {
      statsMap[item._id?.toString()] = item;
    });

    //merge bde and stats
    const result = executivies.map((user) => {
      const stats = statsMap[user._id.toString()] || {
        total: 0,
        completed: 0,
        pending: 0,
      };

      return {
        bdeId: user._id,
        fullName: user.fullName,
        branchName: user.branchId.branchName,
        mobileNo: user.mobileNo,
        totalLeads: stats.total,
        completedLeads: stats.completed,
        pendingLeads: stats.pending,
      };
    });

    return res.status(200).json({
      message: "Successfully get report.",
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//export bde lead report
const exportBdeLeadReport = async (req, res) => {
  try {
    const loginUser = req.user;
    const loginUserId = loginUser._id;
    const loginUserRole = loginUser.roleId.roleName;
    const { branchId, fromDate, toDate, search } = req.query;

    let userFilter = {};

    if (branchId) {
      userFilter.branchId = branchId;
    }

    if (search) {
      userFilter.$or = [{ fullName: { $regex: search, $options: "i" } }];
    }

    if (loginUserRole === "BDE") {
      userFilter._id = loginUserId;
    }

    //first find id of role 'BDE'
    const bdeRole = await RoleModel.findOne({ roleName: "BDE" }).select("_id");
    if (!bdeRole) {
      return res
        .status(400)
        .json({ message: "BDE role not found.", success: false });
    }

    userFilter.roleId = bdeRole._id;

    //find bde
    const executivies = await UserModel.find(userFilter)
      .populate("branchId")
      .select("_id fullName mobileNo branchId");

    if (executivies.length === 0) {
      return res
        .status(400)
        .json({ message: "BDE not exist.", success: false });
    }

    //date filter for lead
    let leadDateFilter = {};
    if (fromDate || toDate) {
      leadDateFilter.createdAt = {};
      if (fromDate) leadDateFilter.createdAt.$gte = new Date(fromDate);

      if (toDate) {
        let adjustedDate = new Date(toDate);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        leadDateFilter.createdAt.$lte = adjustedDate;
      }
    }

    //aggregate lead
    const leadStats = await LeadModel.aggregate([
      {
        $match: {
          ...leadDateFilter,
        },
      },
      {
        $group: {
          _id: "$assignedToBDE",
          total: {
            $sum: {
              $cond: [{ $in: ["$leadStage", ["SALES", "CLOSED"]] }, 1, 0],
            },
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$leadStage", "CLOSED"] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$leadStage", "SALES"] }, 1, 0],
            },
          },
        },
      },
    ]);

    //convert stats to map
    const statsMap = {};
    leadStats.forEach((item) => {
      statsMap[item._id?.toString()] = item;
    });

    //merge bde and stats
    const result = executivies.map((user) => {
      const stats = statsMap[user._id.toString()] || {
        total: 0,
        completed: 0,
        pending: 0,
      };

      return {
        bdeId: user._id,
        fullName: user.fullName,
        branchName: user.branchId.branchName,
        mobileNo: user.mobileNo,
        totalLeads: stats.total,
        completedLeads: stats.completed,
        pendingLeads: stats.pending,
      };
    });

    //create excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bde_Lead_Report");

    worksheet.columns = [
      { header: "Sr", key: "srNo", width: 10 },
      { header: "BDE", key: "fullName", width: 35 },
      { header: "Branch", key: "branchName", width: 25 },
      { header: "Total", key: "totalLeads", width: 10 },
      { header: "Completed", key: "completedLeads", width: 10 },
      { header: "Pending", key: "pendingLeads", width: 10 },
    ];

    result.forEach((item, idx) => {
      worksheet.addRow({
        srNo: idx + 1,
        fullName: item.fullName,
        branchName: item.branchName,
        totalLeads: item.totalLeads,
        completedLeads: item.completedLeads,
        pendingLeads: item.pendingLeads,
      });
    });

    //send file as response
    res.attachment("BdeLeadReport.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//get lead status report
const getLeadStatusReport = async (req, res) => {
  try {
    const loginUser = req.user;
    const loginUserRole = loginUser.roleId.roleName;
    const loginUserId = loginUser._id;

    if (loginUserRole === "Developer") {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Developers do not have lead report privileges."
      });
    }

    const { fromDate, toDate } = req.query;

    let filter = {};
    if (fromDate && toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }

      if (toDate) {
        let adjustedDate = new Date(toDate);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        filter.createdAt.$lte = adjustedDate;
      }
    }

    if (loginUserRole === "TeleCaller") {
      filter.assignedToTelecaller = loginUserId;
    } else if (loginUserRole === "BDE") {
      filter.assignedToBDE = loginUserId;
    }

    const leadStats = await LeadModel.aggregate([
      {
        $match: {
          ...filter,
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$leadStatus",
                    [
                      "NEW",
                      "ASSIGNED_TO_TELECALLER",
                      "ASSIGNED_TO_BDE",
                      "WON",
                      "LOST",
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },

          ASSIGNED_TO_TELECALLER: {
            $sum: {
              $cond: [
                {
                  $eq: ["$leadStatus", "ASSIGNED_TO_TELECALLER"],
                },
                1,
                0,
              ],
            },
          },

          ASSIGNED_TO_BDE: {
            $sum: {
              $cond: [
                {
                  $eq: ["$leadStatus", "ASSIGNED_TO_BDE"],
                },
                1,
                0,
              ],
            },
          },

          WON: {
            $sum: {
              $cond: [
                {
                  $eq: ["$leadStatus", "WON"],
                },
                1,
                0,
              ],
            },
          },

          LOST: {
            $sum: {
              $cond: [
                {
                  $eq: ["$leadStatus", "LOST"],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    let result = leadStats[0] || {};

    let data = {
      total: result.total || 0,
      assignToTelecaller: result.ASSIGNED_TO_TELECALLER || 0,
      assignToBde: result.ASSIGNED_TO_BDE || 0,
      won: result.WON || 0,
      lost: result.LOST || 0,
    };

    return res.status(200).json({
      message: "Successfully get report.",
      success: true,
      data: data,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//export lead status report
const exportLeadStatusReport = async (req, res) => {
  try {
    const loginUser = req.user;
    const loginUserRole = loginUser.roleId.roleName;
    const loginUserId = loginUser._id;

    if (loginUserRole === "Developer") {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Developers do not have lead report privileges."
      });
    }

    const { fromDate, toDate } = req.query;

    let filter = {};
    if (fromDate && toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }

      if (toDate) {
        let adjustedDate = new Date(toDate);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        filter.createdAt.$lte = adjustedDate;
      }
    }

    if (loginUserRole === "TeleCaller") {
      filter.assignedToTelecaller = loginUserId;
    } else if (loginUserRole === "BDE") {
      filter.assignedToBDE = loginUserId;
    }

    const leadStats = await LeadModel.aggregate([
      {
        $match: {
          ...filter,
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$leadStatus",
                    [
                      "NEW",
                      "ASSIGNED_TO_TELECALLER",
                      "ASSIGNED_TO_BDE",
                      "WON",
                      "LOST",
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },

          ASSIGNED_TO_TELECALLER: {
            $sum: {
              $cond: [
                {
                  $eq: ["$leadStatus", "ASSIGNED_TO_TELECALLER"],
                },
                1,
                0,
              ],
            },
          },

          ASSIGNED_TO_BDE: {
            $sum: {
              $cond: [
                {
                  $eq: ["$leadStatus", "ASSIGNED_TO_BDE"],
                },
                1,
                0,
              ],
            },
          },

          WON: {
            $sum: {
              $cond: [
                {
                  $eq: ["$leadStatus", "WON"],
                },
                1,
                0,
              ],
            },
          },

          LOST: {
            $sum: {
              $cond: [
                {
                  $eq: ["$leadStatus", "LOST"],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    let result = leadStats[0] || {};

    let data = {
      total: result.total || 0,
      assignToTelecaller: result.ASSIGNED_TO_TELECALLER || 0,
      assignToBde: result.ASSIGNED_TO_BDE || 0,
      won: result.WON || 0,
      lost: result.LOST || 0,
    };

    // { total: 53, assignToTelecaller: 0, assignToBde: 3, won: 2, lost: 0 }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Lead_Status_Report");

    worksheet.columns = [
      { header: "Status", key: "status", width: 25 },
      { header: "Count", key: "count", width: 15 },
    ];

    worksheet.addRow({
      status: "Total",
      count: data.total || 0,
    });

    worksheet.addRow({
      status: "Assign To Telecaller",
      count: data.assignToTelecaller || 0,
    });

    worksheet.addRow({
      status: "Assign To BDE",
      count: data.assignToBde || 0,
    });

    worksheet.addRow({
      status: "Won",
      count: data.won || 0,
    });

    worksheet.addRow({
      status: "Lost",
      count: data.lost || 0,
    });

    res.attachment("LeadStatusReport.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// Add new template
const addWhatsappTemplate = async (req, res) => {
  try {
    const { templateName, templateText } = req.body;
    const createdBy = req.user._id;
    if (!templateName || !templateText) {
      return res
        .status(400)
        .json({ success: false, message: "Name and text required" });
    }
    const template = new WhatsappTemplateModel({
      templateName,
      templateText,
      createdBy,
    });
    await template.save();
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete WhatsApp template by ID
const deleteWhatsappTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Template ID required" });
    }
    const deleted = await WhatsappTemplateModel.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }
    res.json({ success: true, message: "Template deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Get all templates (shared across all users)
const getWhatsappTemplates = async (req, res) => {
  try {
    const templates = await WhatsappTemplateModel.find({}).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send WhatsApp message to a lead
const sendWhatsappToLead = async (req, res) => {
  try {
    const { leadId, message } = req.body;
    const sentBy = req.user._id;
    if (!leadId || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Lead ID and message are required" });
    }
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }
    const whatsappNo = lead.whatsappNo || lead.mobileNo;
    if (!whatsappNo) {
      return res.status(400).json({
        success: false,
        message: "Lead does not have a WhatsApp or mobile number",
      });
    }
    const result = await sendWATextServ(whatsappNo, message);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Failed to send WhatsApp message",
      });
    }
    // Save chat record after successful send
    try {
      await WhatsappChatModel.create({
        leadId: lead._id,
        leadName: lead.fullName || "",
        whatsappNo: whatsappNo,
        message: message,
        sentBy: sentBy,
      });
    } catch (logErr) {
      // Don't fail the request if logging fails
    }
    return res.json({
      success: true,
      message: "WhatsApp message sent successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get all WhatsApp chat records (Admin only)
const getWhatsappChats = async (req, res) => {
  try {
    let { page = 1, limit = 20, search, fromDate, toDate } = req.query;
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.max(1, parseInt(limit, 10) || 20);

    const filter = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { leadName: regex },
        { whatsappNo: regex },
        { message: regex },
      ];
    }

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const skip = (page - 1) * limit;

    const [total, chats] = await Promise.all([
      WhatsappChatModel.countDocuments(filter),
      WhatsappChatModel.find(filter)
        .populate("sentBy", "fullName")
        .populate("leadId", "leadNo fullName mobileNo whatsappNo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Successfully fetched WhatsApp chat records.",
      data: chats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
// Delete WhatsApp chat record by ID
const deleteWhatsappChat = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Chat ID required" });
    }
    const deleted = await WhatsappChatModel.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Chat record not found" });
    }
    res.json({ success: true, message: "Chat record deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete all WhatsApp chat records
const deleteAllWhatsappChats = async (req, res) => {
  try {
    const result = await WhatsappChatModel.deleteMany({});
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} chat records.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  deleteManyLead,
  importLead,
  downSample,
  exportLead,
  manyAdminToTelecaller,
  manyTelecallerToBde,
  getLeadProgess,
  manyBdeToAdmin,
  singleTelecallerToBde,
  getTelecallerLeadReport,
  exportTelecallerLeadReport,
  getBdeLeadReport,
  exportBdeLeadReport,
  getLeadStatusReport,
  exportLeadStatusReport,
  getWhatsappTemplates,
  addWhatsappTemplate,
  sendWhatsappToLead,
  getWhatsappChats,
  deleteWhatsappTemplate,
  deleteWhatsappChat,
  deleteAllWhatsappChats,
};
