const driverMasterModel = require("../models").driverMaster;
const Op = require('sequelize').Op;
const { sequelize } = require("../models");
const { Sequelize, fn, literal } = require("sequelize");

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];

module.exports = {
    upload_driver_image: multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dest = path.join(config.FILE_UPLOAD_PATH, "image", "driver");
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        cb(null, "driver_" + Date.now() + path.extname(file.originalname));
      },
    }),
  }),

  upload_conductor_image: multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dest = path.join(config.FILE_UPLOAD_PATH, "image", "conductor");
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        cb(null, "conductor_" + Date.now() + path.extname(file.originalname));
      },
    }),
  }),



  saveDriver(req, res) {
    console.log("reqqqqqqqqqqq", req.body);

    try {
      const data = {
        driver_id: req.body.driver_id,
        driver_name: req.body.driver_name,
        contact_no: req.body.contact_no,
        aadhaar: req.body.aadhaar,
        pan: req.body.pan,
        voter: req.body.voter,
        dl: req.body.dl,
        address: req.body.address,
        status: "Active",
        photo: req.file ? `image/driver/${req.file.filename}` : null,
      };
      return driverMasterModel
        .create(data)
        .then((project) => {
          console.log("hhhhhhhhhhhhhhh", project);
          res.status(200).send({ message: "Success" });
        })
        .catch((err) => {
          console.log("DB error:", err);
          res.status(500).send({ message: "Database error" });
        });
    } catch (err) {
      console.log("Server error:", err);
      res.status(500).send({ message: "Server error" });
    }
  },

  updateDriver(req, res) {
    try {
      const {
        id,
        driver_id,
        driver_name,
        contact_no,
        aadhaar,
        pan,
        voter,
        dl,
        address,
        old_photo,
      } = req.body;

      if (!id) {
        return res.status(400).send({ message: "Driver ID is required" });
      }

      // keep old photo by default
      let photoPath = old_photo;

      // if new photo uploaded
      if (req.file) {
        photoPath = `image/driver/${req.file.filename}`;

        // delete old photo
        if (old_photo) {
          const fullOldPath = path.join(config.FILE_UPLOAD_PATH, old_photo);

          if (fs.existsSync(fullOldPath)) {
            fs.unlinkSync(fullOldPath);
          }
        }
      }

      const updateData = {
        driver_id,
        driver_name,
        contact_no,
        aadhaar,
        pan,
        voter,
        dl,
        address,
        photo: photoPath,
      };

      driverMasterModel
        .update(updateData, { where: { id } })
        .then(() => {
          return res
            .status(200)
            .send({ message: "Driver updated successfully" });
        })
        .catch((err) => {
          console.log("DB error:", err);
          res.status(500).send({ message: "Database error" });
        });
    } catch (err) {
      console.log("Server error:", err);
      res.status(500).send({ message: "Server error" });
    }
  },

  deleteDriver(req, res) {
    let data = req.body.requestObject;
    driverMasterModel
      .update({ status: "Inactive" }, { where: { id: data.id } })
      .then((response) => {
        return res.status(200).send({ message: "Success" });
      })
      .catch((err) => {
        console.log("err", err);
      });
  },

  getDriver(req, res) {
    console.log("here");

    driverMasterModel.findAll({
      where: { status: "Active" },
      attributes: [
        "id",
        "driver_id",
        "driver_name",
        "contact_no",
        "aadhaar",
        "pan",
        "voter",
        "dl",
        "address",
        "photo",
        "status",
      ],
      order: [["driver_name", "ASC"]],
      raw: true
    })
      .then((drivers) => {
        return res.status(200).send(drivers);
      })
      .catch((error) => {
        console.log(error);
        return res.status(400).send(error);
      });
  },


}