const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const getStoreFilePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'accounts.json');
};

const readAccounts = () => {
  try {
    const filePath = getStoreFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.trim()) {
      return [];
    }
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('读取账号配置失败:', e);
    return [];
  }
};

const writeAccounts = (accounts) => {
  try {
    const filePath = getStoreFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (e) {
    console.error('写入账号配置失败:', e);
  }
};

const getAccounts = () => {
  return readAccounts();
};

const addAccount = ({ label, email, password }) => {
  const accounts = readAccounts();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const account = { id, label, email, password };
  accounts.push(account);
  writeAccounts(accounts);
  return account;
};

const removeAccount = (id) => {
  const accounts = readAccounts();
  const next = accounts.filter((a) => a.id !== id);
  writeAccounts(next);
};

module.exports = {
  getAccounts,
  addAccount,
  removeAccount,
};
