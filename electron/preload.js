const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => ipcRenderer.invoke("ping"),
  participants: {
    list: () => ipcRenderer.invoke("participants:list"),
    create: data => ipcRenderer.invoke("participants:create", data),
    update: payload => ipcRenderer.invoke("participants:update", payload),
    remove: id => ipcRenderer.invoke("participants:delete", id),
    bulkSave: rows => ipcRenderer.invoke("participants:bulkSave", rows)
  }
});
