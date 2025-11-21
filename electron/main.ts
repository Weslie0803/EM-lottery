import { app, BrowserWindow, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import {
  bulkSaveParticipants,
  createParticipant,
  deleteParticipant,
  initDatabase,
  listParticipants,
  updateParticipant
} from "./db";

const isDev = process.env.NODE_ENV === "development";

const userDataPath = path.join(process.cwd(), ".electron-data");
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}
app.setPath("userData", userDataPath);
initDatabase(userDataPath);

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // __dirname 在编译后指向 dist-electron，这里使用编译产物
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });

  if (isDev) {
    await win.loadURL("http://127.0.0.1:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexHtml = path.join(__dirname, "../dist-renderer/index.html");
    await win.loadFile(indexHtml);
  }
}

app.whenReady().then(() => {
  createWindow().catch(err => {
    console.error("Failed to create window", err);
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(console.error);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("ping", () => "pong from main");
ipcMain.handle("participants:list", () => listParticipants());
ipcMain.handle("participants:create", (_event, payload) => createParticipant(payload));
ipcMain.handle("participants:update", (_event, payload) => updateParticipant(payload));
ipcMain.handle("participants:delete", (_event, id: string) => {
  deleteParticipant(id);
});
ipcMain.handle("participants:bulkSave", (_event, rows) => bulkSaveParticipants(rows));
