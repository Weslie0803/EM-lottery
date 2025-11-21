import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => ipcRenderer.invoke("ping"),
  participants: {
    list: () => ipcRenderer.invoke("participants:list"),
    create: (data: unknown) => ipcRenderer.invoke("participants:create", data),
    update: (payload: unknown) => ipcRenderer.invoke("participants:update", payload),
    remove: (id: string) => ipcRenderer.invoke("participants:delete", id),
    bulkSave: (rows: unknown) => ipcRenderer.invoke("participants:bulkSave", rows)
  }
});
