const prisma = require("../prisma/client");

async function getRootFolder(req, res) {
  try {
    const rootFolder = await prisma.folder.findFirst({
      where: { ownerId: req.user.id, parentId: null },
      include: { files: true, children: true },
    });
    console.log(rootFolder);
    res.render("storage", { rootFolder });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

module.exports = { getRootFolder };
