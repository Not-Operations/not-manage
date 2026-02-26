const { spawn } = require("node:child_process");

function openBrowser(url) {
  return new Promise((resolve, reject) => {
    let command = "";
    let args = [];

    if (process.platform === "darwin") {
      command = "open";
      args = [url];
    } else if (process.platform === "win32") {
      command = "cmd";
      args = ["/c", "start", "", url];
    } else {
      command = "xdg-open";
      args = [url];
    }

    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
    });

    child.on("error", reject);
    child.unref();
    resolve();
  });
}

module.exports = {
  openBrowser,
};
