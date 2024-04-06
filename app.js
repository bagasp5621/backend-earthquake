const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const errorHandler = require("./utils/errorHandler");

const earthquakeRouter = require("./routes/earthquakeRouter");

// API Rate limit
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max:
    process.env.NODE_ENV === "development"
      ? process.env.RATE_LIMIT_DEV
      : process.env.RATE_LIMIT_PROD,
  message: "Too many requests from this IP, please try again in a few minutes",
});

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(helmet());
app.use(limiter);
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  cors({
    origin: "http://localhost:5173", // Replace with your actual frontend origin
    credentials: true,
  })
);

app.use("/v1/earthquake", earthquakeRouter);

app.use(function (req, res, next) {
  res.status(404).json({ message: "404 Not Found" });
});

app.use(errorHandler);

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", function () {
  console.log("MongoDB database connection established successfully");
});

module.exports = app;
