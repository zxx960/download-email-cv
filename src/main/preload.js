const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message) => ipcRenderer.send('message', message),
  
  // 邮件相关API
  email: {
    connect: (email, password) => ipcRenderer.invoke('email:connect', { email, password }),
    download: () => ipcRenderer.invoke('email:download'),
    disconnect: () => ipcRenderer.invoke('email:disconnect'),
    onProgress: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('email:progress', subscription);
      // 返回取消订阅函数
      return () => ipcRenderer.removeListener('email:progress', subscription);
    }
  }
})
