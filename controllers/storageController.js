const prisma = require("../prisma/client");
const getFileSize = require("../utils/getFileSize");
const crypto = require("crypto");

const getAllFiles = async (folder) => {
  if (!folder) return [];

  let files = [...folder.files];

  for (const child of folder.children) {
    const childFolder = await prisma.folder.findUnique({
      where: { id: child.id },
      include: {
        files: true,
        children: true,
      },
    });
    const childFiles = await getAllFiles(childFolder);
    files = [...files, ...childFiles];
  }

  return files;
};

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
    const invalidName = req.query.invalidName === "true" ? true : false;

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
      invalidName: invalidName,
      shareLink: req.query.shareLink ? req.query.shareLink : "",
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

    const path = await getFolderRoute(file.folderId);

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
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        files: true,
        children: true,
      },
    });

    if (folder.ownerId !== req.user.id) {
      return res.status(403).send("Forbidden");
    }

    const files = await getAllFiles(folder);

    const pathsPromises = files.map(async (file) => {
      const folderRoute = await getFolderRoute(file.folderId);
      return `${req.user.id}/${folderRoute.join("/")}/${file.name}`;
    });

    const paths = await Promise.all(pathsPromises);

    await prisma.folder.delete({ where: { id: folderId } });

    return paths;
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

async function renameFile(req, res) {
  try {
    const fileId = parseInt(req.params.id);
    const newName = req.body.newName;
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    const oldName = file.name;

    const folder = await prisma.folder.findUnique({
      where: { id: file.folderId },
    });

    if (folder.ownerId !== req.user.id) {
      return res.status(403).send("Forbidden");
    }

    await prisma.file.update({
      where: { id: fileId },
      data: { name: newName },
    });

    const path = await getFolderRoute(file.folderId);

    return {
      ...file,
      oldName: oldName,
      newName: newName,
      path: path.join("/"),
    };
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

async function renameFolder(req, res) {
  try {
    const folderId = parseInt(req.params.id);
    const newName = req.body.newName;
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: { files: true, children: true },
    });

    if (folder.ownerId !== req.user.id) {
      return res.status(403).send("Forbidden");
    }

    const files = await getAllFiles(folder);

    const pathsPromises = files.map(async (file) => {
      const folderRoute = await getFolderRoute(file.folderId);
      return `${req.user.id}/${folderRoute.join("/")}/${file.name}`;
    });

    const oldPaths = await Promise.all(pathsPromises);

    await prisma.folder.update({
      where: { id: folderId },
      data: { name: newName },
    });

    const newPathsPromises = files.map(async (file) => {
      const folderRoute = await getFolderRoute(file.folderId);
      return `${req.user.id}/${folderRoute.join("/")}/${file.name}`;
    });

    const newPaths = await Promise.all(newPathsPromises);

    return {
      oldPaths: oldPaths,
      newPaths: newPaths,
      parentId: folder.parentId,
    };
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

async function checkIfNameIsFree(parentId, name) {
  const folder = await prisma.folder.findUnique({
    where: { id: parentId },
    include: { files: true, children: true },
  });

  if (folder.files.some((file) => file.name === name)) {
    return false;
  }

  if (folder.children.some((child) => child.name === name)) {
    return false;
  }

  return true;
}

async function shareFolder(req, res) {
  try {
    const folderId = parseInt(req.params.id);
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: { children: true },
    });

    if (folder.ownerId !== req.user.id) {
      return res.status(403).send("Forbidden");
    }

    const hours = parseInt(req.body.shareTime);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const shareFolder = await prisma.shareFolder.create({
      data: {
        expiresAt: expiresAt,
        headFolderId: folderId,
        url: crypto.randomUUID(),
      },
    });

    await prisma.folder.update({
      where: { id: folderId },
      data: { shares: { connect: { id: shareFolder.id } } },
    });

    const addAllFoldersAndFiles = async (folder) => {
      if (!folder) return [];

      for (const child of folder.children) {
        const childFolder = await prisma.folder.findUnique({
          where: { id: child.id },
          include: {
            children: true,
          },
        });

        await prisma.folder.update({
          where: { id: childFolder.id },
          data: { shares: { connect: { id: shareFolder.id } } },
        });

        await addAllFoldersAndFiles(childFolder);
      }
    };

    await addAllFoldersAndFiles(folder);

    return shareFolder;
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

async function getSharedFolder(req, res) {
  try {
    const url = req.params.url;
    const shareFolder = await prisma.shareFolder.findFirst({
      where: { url: url },
    });

    if (!shareFolder) {
      return res.status(404).send("Not Found");
    }

    if (shareFolder.expiresAt < new Date()) {
      return res.status(404).send("Not Found");
    }

    const folderId = parseInt(req.query.folder) || shareFolder.headFolderId;

    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: { files: true, children: true, shares: true },
    });

    if (!folder) {
      return res.status(404).send("Not Found");
    }

    if (!folder.shares.some((share) => share.id === shareFolder.id)) {
      return res.status(404).send("Not Found");
    }

    const folderRoute = [];
    let currentFolder = folder;

    while (currentFolder.id !== shareFolder.headFolderId) {
      folderRoute.unshift(currentFolder);
      currentFolder = await prisma.folder.findUnique({
        where: { id: currentFolder.parentId },
      });
    }

    const headFolder = await prisma.folder.findUnique({
      where: { id: shareFolder.headFolderId },
    });

    const headFolderName = headFolder.parentId ? headFolder.name : "Home";

    res.render("shared", {
      folder: folder,
      folderRoute: folderRoute,
      shareUrl: url,
      headFolderName: headFolderName,
    });
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
  renameFile,
  renameFolder,
  checkIfNameIsFree,
  shareFolder,
  getSharedFolder,
};
