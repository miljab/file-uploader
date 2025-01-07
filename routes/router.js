const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");
const storageController = require("../controllers/storageController");
const router = express.Router();
const supabase = require("../config/supabase");
const multer = require("multer");
const { file } = require("../prisma/client");
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
      const folderId =
        parseInt(req.query.folder) || parseInt(req.rootFolder?.id);

      const folderRoute = await storageController.getFolderRoute(folderId);

      const filePath = `${req.user.id}/${folderRoute.join("/")}/${
        req.file.originalname
      }`;

      const { data, error } = await supabase.storage
        .from("users-files")
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      } else {
        storageController.newFile(req, res);
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

router.get("/download", authController.isAuth, async (req, res) => {
  try {
    const file = await storageController.getFile(req, res);

    console.log(file);

    let path;

    if (file.path.length === 0) {
      path = `${req.user.id}/${file.name}`;
    } else {
      path = `${req.user.id}/${file.path}/${file.name}`;
    }

    const { data, error } = await supabase.storage
      .from("users-files")
      .createSignedUrl(path, 60);

    if (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    } else {
      const fileResponse = await fetch(data.signedUrl);

      if (!fileResponse.ok) {
        return res.status(500).send("Failed to fetch file content.");
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      res.set({
        "Content-Type":
          fileResponse.headers.get("Content-Type") ||
          "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.name}"`,
      });

      res.send(fileBuffer);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/delete-file/:id", authController.isAuth, async (req, res) => {
  try {
    const file = await storageController.deleteFile(req, res);

    let path;

    if (file.path.length === 0) {
      path = `${req.user.id}/${file.name}`;
    } else {
      path = `${req.user.id}/${file.path}/${file.name}`;
    }

    const { data, error } = await supabase.storage
      .from("users-files")
      .remove([path]);

    if (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    } else {
      res.redirect(`/storage?folder=${file.folderId}`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/delete-folder/:id", authController.isAuth, async (req, res) => {
  try {
    const folder = await storageController.deleteFolder(req, res);

    const { data: list, listError } = await supabase.storage
      .from("users-files")
      .list(`${req.user.id}/${folder.path}`);

    console.log(list);
    if (list.length === 0) {
      return res.redirect(`/storage?folder=${folder.parentId}`);
    }

    const filesToRemove = list.map((file) => {
      return `${req.user.id}/${folder.path}/${file.name}`;
    });

    const { data, error } = await supabase.storage
      .from("users-files")
      .remove(filesToRemove);

    if (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    } else {
      res.redirect(`/storage?folder=${folder.parentId}`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
