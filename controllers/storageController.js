const prisma = require("../prisma/client");
const getFileSize = require("../utils/getFileSize");

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

async function getFolderRoute(folderId) {
  try {
    const folder = await prisma.folder.findUnique({
      where: { id: parseInt(folderId) },
      include: { files: true, children: true },
    });

    const folderRoute = [];
    let currentFolder = folder;

    while (currentFolder.parentId) {
      folderRoute.unshift(currentFolder.name);
      currentFolder = await prisma.folder.findUnique({
        where: { id: currentFolder.parentId },
      });
    }

    return folderRoute;
  } catch (err) {
    console.error(err);
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
      folderRoute.unshift(currentFolder);
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
    const size = getFileSize(req.file.size);
    const file = await prisma.file.create({
      data: {
        name: req.file.originalname,
        folderId: folderId,
        size: size,
      },
    });
    res.redirect(`/storage?folder=${folderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

async function getFile(req, res) {
  try {
    const fileId = parseInt(req.query.file);
    const file = await prisma.file.findUnique({ where: { id: fileId } });

    console.log(file);

    const path = await getFolderRoute(file.folderId);

    console.log(path);

    return { ...file, path: path.join("/") };
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

async function deleteFile(req, res) {
  try {
    const fileId = parseInt(req.params.id);
    const file = await prisma.file.findUnique({ where: { id: fileId } });

    const folder = await prisma.folder.findUnique({
      where: { id: file.folderId },
    });

    if (folder.ownerId !== req.user.id) {
      return res.status(403).send("Forbidden");
    }

    const path = await getFolderRoute(file.folderId);

    await prisma.file.delete({ where: { id: fileId } });

    return { ...file, path: path.join("/") };
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

async function deleteFolder(req, res) {
  try {
    const folderId = parseInt(req.params.id);
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });

    if (folder.ownerId !== req.user.id) {
      return res.status(403).send("Forbidden");
    }

    const path = await getFolderRoute(folderId);

    await prisma.folder.delete({ where: { id: folderId } });

    return { ...folder, path: path.join("/") };
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

module.exports = {
  getRootFolder,
  getFolder,
  newFolder,
  getFolderRoute,
  newFile,
  getFile,
  deleteFile,
  deleteFolder,
};
