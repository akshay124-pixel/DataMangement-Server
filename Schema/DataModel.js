const mongoose = require("mongoose");

const EntrySchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, "Customer name must be at least 1 character"],
    maxlength: [100, "Customer name cannot exceed 100 characters"],
  },
  mobileNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^\d{10}$/, "Mobile number must be exactly 10 digits"],
  },
  address: {
    type: String,
    required: true,
    trim: true,
    minlength: [5, "Address must be at least 5 characters"],
    maxlength: [200, "Address cannot exceed 200 characters"],
  },
  organization: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, "Organization must be at least 1 character"],
    maxlength: [100, "Organization cannot exceed 100 characters"],
  },
  products: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, "Products must be at least 1 character"],
    maxlength: [100, "Products cannot exceed 100 characters"],
  },
  type: {
    type: String,
    enum: ["Partner", "Customer"],
    default: "Customer",
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: {
      values: ["Private", "Government"],
      message: "Category must be either 'Private' or 'Government'",
    },
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, "City must be at least 1 character"],
    maxlength: [50, "City cannot exceed 50 characters"],
  },
  state: {
    type: String,
    required: true,
    trim: true,
    minlength: [2, "State must be at least 2 characters"],
    maxlength: [50, "State cannot exceed 50 characters"],
  },
  status: {
    type: String,
    enum: {
      values: ["Interested", "Not Interested", "Maybe", "Not Found"],
      message:
        "Status must be either 'Interested', 'Not Interested', or 'Maybe'",
    },
    default: "Not Found",
  },
  expectedClosingDate: {
    type: Date,
    min: [Date.now, "Expected closing date cannot be in the past"],
  },
  followUpDate: {
    type: Date,
    min: [Date.now, "Follow UpDate date cannot be in the past"],
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, "Remarks cannot exceed 500 characters"],
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

EntrySchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Entry = mongoose.model("Entry", EntrySchema);

module.exports = Entry;
