function getFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + " bytes";
  } else if (bytes < 1048576) {
    return (bytes / 1024).toFixed(1) + " KB";
  } else {
    return (bytes / 1048576).toFixed(1) + " MB";
  }
}

module.exports = getFileSize;
