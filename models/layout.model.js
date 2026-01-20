const mongoose = require("mongoose");

const Layout = mongoose.model(
  "Layout",
  new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    page: { type: String, required: true },
    section: { type: String, required: true },
    rows: { type: Number, required: true },
    rowData: [
      {
        columns: { type: Number, enum: [1, 2, 3, 4, 6], required: true },
        ratio: [
            {
                type: String,
                enum: ["full", "extreme", "extreme-mean", "mean", "mean-extreme"],
            },
        ],
        columnData: [
          {
            item: {
              type: String,
              enum: ["title-content", "title", "content", "image", "overlay", "generatif"],
            },
            // golden ratio proportion
            ratio: {
              type: String,
              enum: ["full", "extreme", "extreme-mean", "mean", "mean-extreme"],
            },
          },
        ],
      },
    ],
  })
);

module.exports = Layout;
