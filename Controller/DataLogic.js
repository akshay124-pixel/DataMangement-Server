const Entry = require("../Schema/DataModel");
const mongoose = require("mongoose");
const User = require("../Schema/Model");
const XLSX = require("xlsx");

// DataentryLogic - Create a single entry
const DataentryLogic = async (req, res) => {
  try {
    const {
      customerName,
      mobileNumber,
      address,
      state,
      city,
      organization,
      type,
      category,
      products,
      status,
      expectedClosingDate,
      followUpDate,
      remarks,
    } = req.body;

    const requiredFields = {
      customerName,
      mobileNumber,
      address,
      state,
      city,
      products,
      type,
      organization,
      category,
    };
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value || typeof value !== "string" || value.trim() === "") {
        return res.status(400).json({
          success: false,
          message: `${
            field.charAt(0).toUpperCase() + field.slice(1)
          } is required and must be a non-empty string.`,
        });
      }
    }

    const newEntry = new Entry({
      customerName: customerName.trim(),
      mobileNumber: mobileNumber.trim(),
      address: address.trim(),
      products: products.trim(),
      type: type.trim(),
      state: state.trim(),
      city: city.trim(),
      organization: organization.trim(),
      category: category.trim(),
      createdBy: req.user.id, // Add user ID from JWT
      ...(status && { status }),
      ...(expectedClosingDate && {
        expectedClosingDate: new Date(expectedClosingDate),
      }),
      ...(followUpDate && { followUpDate: new Date(followUpDate) }),
      ...(remarks && { remarks }),
    });

    if (expectedClosingDate && isNaN(new Date(expectedClosingDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid expectedClosingDate format",
      });
    }
    if (followUpDate && isNaN(new Date(followUpDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid followUpDate format",
      });
    }

    await newEntry.save();

    res.status(201).json({
      success: true,
      data: newEntry,
      message: "Entry created successfully.",
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }
    console.error("Error in DataentryLogic:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// exportentry - Export entries to XLSX (filtered by role)
const exportentry = async (req, res) => {
  try {
    let entries;
    if (req.user.role === "Admin") {
      entries = await Entry.find().lean();
    } else {
      entries = await Entry.find({ createdBy: req.user.id }).lean();
    }

    const formattedEntries = entries.map((entry) => ({
      customerName: entry.customerName,
      mobileNumber: entry.mobileNumber,
      address: entry.address,
      state: entry.state,
      city: entry.city,
      products: entry.products,
      type: entry.type,
      organization: entry.organization,
      category: entry.category,
      status: entry.status || "Not Found",
      createdAt: entry.createdAt.toLocaleDateString(),
      expectedClosingDate: entry.expectedClosingDate
        ? entry.expectedClosingDate.toLocaleDateString()
        : "Not Found",
      followUpDate: entry.followUpDate
        ? entry.followUpDate.toLocaleDateString()
        : "Not Found",
      remarks: entry.remarks || "Not Found",
    }));

    const ws = XLSX.utils.json_to_sheet(formattedEntries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Entries");

    const fileBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", "attachment; filename=entries.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(fileBuffer);
  } catch (error) {
    console.error("Error exporting entries:", error.message);
    res.status(500).json({
      success: false,
      message: "Error exporting entries",
      error: error.message,
    });
  }
};

// fetchEntries - Fetch entries based on role
const fetchEntries = async (req, res) => {
  try {
    let entries;
    if (req.user.role === "Admin") {
      entries = await Entry.find().populate("createdBy", "username").lean();
    } else {
      entries = await Entry.find({ createdBy: req.user.id })
        .populate("createdBy", "username")
        .lean();
    }
    res.status(200).json(entries);
  } catch (error) {
    console.error("Error fetching entries:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch entries",
      error: error.message,
    });
  }
};

// DeleteData - Delete a single entry (only if created by user or admin)
const DeleteData = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid entry ID" });
    }

    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    if (
      req.user.role !== "Admin" &&
      entry.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await Entry.findByIdAndDelete(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting entry:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete entry",
      error: error.message,
    });
  }
};

// editEntry - Update an entry (only if created by user or admin)
const editEntry = async (req, res) => {
  try {
    const {
      customerName,
      mobileNumber,
      address,
      state,
      city,
      products,
      type,
      organization,
      category,
      status,
      expectedClosingDate,
      followUpDate,
      remarks,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid entry ID" });
    }

    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    if (
      req.user.role !== "Admin" &&
      entry.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const updateData = {
      ...(customerName !== undefined && { customerName: customerName.trim() }),
      ...(mobileNumber !== undefined && { mobileNumber: mobileNumber.trim() }),
      ...(address !== undefined && { address: address.trim() }),
      ...(state !== undefined && { state: state.trim() }),
      ...(city !== undefined && { city: city.trim() }),
      ...(products !== undefined && { products: products.trim() }),
      ...(type !== undefined && { type: type.trim() }),
      ...(organization !== undefined && { organization: organization.trim() }),
      ...(category !== undefined && { category: category.trim() }),
      ...(status !== undefined && { status }),
      ...(expectedClosingDate !== undefined && {
        expectedClosingDate: expectedClosingDate
          ? new Date(expectedClosingDate)
          : null,
      }),
      ...(followUpDate !== undefined && {
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      }),
      ...(remarks !== undefined && { remarks }),
    };

    if (expectedClosingDate !== undefined && expectedClosingDate) {
      if (isNaN(new Date(expectedClosingDate).getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expectedClosingDate format",
        });
      }
    }
    if (followUpDate !== undefined && followUpDate) {
      if (isNaN(new Date(followUpDate).getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid followUpDate format",
        });
      }
    }

    const updatedEntry = await Entry.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    res.status(200).json({
      success: true,
      data: updatedEntry,
      message: "Entry updated successfully",
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }
    console.error("Error in editEntry:", error.message);
    res.status(500).json({
      success: false,
      message: "Error updating entry",
      error: error.message,
    });
  }
};

// bulkUploadStocks - Bulk upload entries
const bulkUploadStocks = async (req, res) => {
  try {
    const newEntries = req.body;

    if (!Array.isArray(newEntries) || newEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid data format. Array expected.",
      });
    }

    const validatedEntries = newEntries.map((entry) => {
      const requiredFields = [
        "customerName",
        "mobileNumber",
        "address",
        "products",
        "type",
        "state",
        "city",
        "organization",
        "category",
      ];
      for (const field of requiredFields) {
        if (
          !entry[field] ||
          typeof entry[field] !== "string" ||
          entry[field].trim() === ""
        ) {
          throw new Error(
            `${field} is required and must be a non-empty string`
          );
        }
      }

      return {
        customerName: entry.customerName.trim(),
        mobileNumber: entry.mobileNumber.trim(),
        address: entry.address.trim(),
        state: entry.state.trim(),
        city: entry.city.trim(),
        products: entry.products.trim(),
        type: entry.type.trim(),
        organization: entry.organization.trim(),
        category: entry.category.trim(),
        createdBy: req.user.id, // Add user ID from JWT
        createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
        ...(entry.status && { status: entry.status }),
        ...(entry.expectedClosingDate && {
          expectedClosingDate: new Date(entry.expectedClosingDate),
        }),
        ...(entry.followUpDate && {
          followUpDate: new Date(entry.followUpDate),
        }),
        ...(entry.remarks && { remarks: entry.remarks }),
      };
    });

    const batchSize = 500;
    for (let i = 0; i < validatedEntries.length; i += batchSize) {
      const batch = validatedEntries.slice(i, i + batchSize);
      await Entry.insertMany(batch, { ordered: false });
    }

    res
      .status(201)
      .json({ success: true, message: "Entries uploaded successfully!" });
  } catch (error) {
    console.error("Error in bulk upload:", error.message);
    res.status(400).json({
      success: false,
      message: "Failed to upload entries",
      error: error.message,
    });
  }
};

// getAdmin - Check if user is admin
const getAdmin = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: No user found" });
    }

    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, isAdmin: user.role === "Admin" });
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  bulkUploadStocks,
  DataentryLogic,
  fetchEntries,
  DeleteData,
  editEntry,
  exportentry,
  getAdmin,
};
