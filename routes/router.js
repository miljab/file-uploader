const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");
const storageController = require("../controllers/storageController");
const router = express.Router();
const supabase = require("../config/supabase");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", authController.isNotAuth, (req, res) => {
  res.render("index");
});

router.get("/login", authController.isNotAuth, (req, res) => {
  res.render("login");
});

router.get("/login-failure", authController.isNotAuth, (req, res) => {
  res.render("login", {
    errors: [{ msg: "Wrong username or password" }],
  });
});

router.get("/signup", authController.isNotAuth, (req, res) => {
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

router.get("/logout", authController.isAuth, (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Error during logout." });
    }
    res.redirect("/");
  });
});

router.get("/storage", authController.isAuth, storageController.getFolder);

router.post("/new-folder", authController.isAuth, storageController.newFolder);

router.post(
  "/new-file",
  authController.isAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const folderRoute = await storageController.getFolderRouteString(
        req,
        res
      );

      const filePath = `${req.user.id}/${folderRoute}/${req.file.originalname}`;

      const { data, error } = await supabase.storage
        .from("users-files")
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      } else {
        res.redirect(`/storage?folder=${req.query.folder}`);
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

module.exports = router;
