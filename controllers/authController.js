const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const prisma = require("../prisma/client");

function isAuth(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/");
  }
}

function isNotAuth(req, res, next) {
  if (!req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/storage");
  }
}

const registerValidation = [
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long")
    .custom(async (value) => {
      const user = await prisma.user.findUnique({ where: { username: value } });
      if (user) {
        throw new Error("Username already exists");
      }
      return true;
    }),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
];

registerPost = [
  registerValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("signup", {
        errors: errors.array(),
      });
    }

    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
        },
      });
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error registering user");
    }
  },
];

module.exports = {
  isAuth,
  isNotAuth,
  registerPost,
};
