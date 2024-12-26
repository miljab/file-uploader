const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/login-failure", (req, res) => {
  res.render("login", {
    errors: [{ msg: "Wrong username or password" }],
  });
});

router.get("/signup", (req, res) => {
  res.render("signup");
});

router.post("/signup", authController.registerPost);

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/storage",
    failureRedirect: "/login-failure",
  })
);

router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Error during logout." });
    }
    res.redirect("/");
  });
});

router.get("/storage", authController.isAuth, (req, res) => {
  res.render("storage");
});

module.exports = router;
