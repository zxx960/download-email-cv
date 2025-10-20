const {app, BrowserWindow, ipcMain, session, shell} = require('electron');
const {join} = require('path');
const EmailHandler = require('./emailHandler');

let emailHandler = null;

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  if (process.env.NODE_ENV === 'development') {
    const rendererPort = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
  }
  else {
    mainWindow.loadFile(join(app.getAppPath(), 'renderer', 'index.html'));
  }

  return mainWindow;
}

app.whenReady().then(() => {
  createWindow();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['script-src \'self\'']
      }
    })
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});

ipcMain.on('message', (event, message) => {
  console.log(message);
});

// 邮件相关的IPC handlers
ipcMain.handle('email:connect', async (event, { email, password }) => {
  try {
    emailHandler = new EmailHandler();
    const result = await emailHandler.connect(email, password);
    return result;
  } catch (error) {
    return { success: false, message: error.message || '连接失败' };
  }
});

ipcMain.handle('email:download', async (event) => {
  try {
    if (!emailHandler) {
      return { success: false, message: '请先连接邮箱' };
    }

    const mainWindow = BrowserWindow.getAllWindows()[0];
    
    const result = await emailHandler.downloadUnreadAttachments((progress) => {
      // 发送进度更新到渲染进程
      if (mainWindow) {
        mainWindow.webContents.send('email:progress', progress);
      }
    });

    return result;
  } catch (error) {
    return { success: false, message: error.message || '下载失败' };
  } finally {
    if (emailHandler) {
      emailHandler.disconnect();
      emailHandler = null;
    }
  }
});

ipcMain.handle('email:disconnect', async (event) => {
  if (emailHandler) {
    emailHandler.disconnect();
    emailHandler = null;
  }
  return { success: true };
});

// 系统相关的IPC handlers
ipcMain.handle('system:openPath', async (event, path) => {
  try {
    const result = await shell.openPath(path);
    if (result) {
      return { success: false, message: `无法打开路径: ${result}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});
