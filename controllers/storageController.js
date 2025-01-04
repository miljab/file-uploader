const prisma = require("../prisma/client");

async function getRootFolder(req, res, next) {
  if (req.isAuthenticated()) {
    try {
      const rootFolder = await prisma.folder.findFirst({
        where: { ownerId: req.user.id, parentId: null },
        include: { files: true, children: true },
      });
      req.rootFolder = rootFolder;
      next();
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
}

async function getFolder(req, res) {
  try {
    const folderId = parseInt(req.query.folder) || parseInt(req.rootFolder?.id);

    if (!folderId) {
      return res.status(404).send("Folder not found.");
    }

    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: { files: true, children: true },
    });

    if (folder.ownerId !== req.user.id) {
      return res.status(403).send("Forbidden");
    }

    const folderRoute = [];
    let currentFolder = folder;

    while (currentFolder.parentId) {
      folderRoute.unshift({ id: currentFolder.id, name: currentFolder.name });
      currentFolder = await prisma.folder.findUnique({
        where: { id: currentFolder.parentId },
      });
    }

    res.render("storage", {
      folder: folder,
      folderRoute: folderRoute,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

async function getFolderRouteString(req, res) {
  try {
    const folderId = parseInt(req.query.folder) || parseInt(req.rootFolder?.id);

    if (!folderId) {
      return res.status(404).send("Folder not found.");
    }

    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: { files: true, children: true },
    });

    if (folder.ownerId !== req.user.id) {
      return res.status(403).send("Forbidden");
    }

    const folderRoute = [];
    let currentFolder = folder;

    while (currentFolder.parentId) {
      folderRoute.unshift(currentFolder.name);
      currentFolder = await prisma.folder.findUnique({
        where: { id: currentFolder.parentId },
      });
    }

    return folderRoute.join("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

async function newFolder(req, res) {
  try {
    const parentId = parseInt(req.query.folder) || parseInt(req.rootFolder.id);

    const folder = await prisma.folder.create({
      data: {
        name: req.body.folder,
        ownerId: req.user.id,
        parentId: parentId,
      },
    });

    res.redirect(`/storage?folder=${parentId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

async function newFile(req, res) {
  try {
    const folderId = parseInt(req.query.folder) || parseInt(req.rootFolder.id);
    const file = await prisma.file.create({
      data: {
        name: req.file.originalname,
        folderId: folderId,
      },
    });
    res.redirect(`/storage?folder=${folderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

module.exports = {
  getRootFolder,
  getFolder,
  newFolder,
  getFolderRouteString,
  newFile,
};
