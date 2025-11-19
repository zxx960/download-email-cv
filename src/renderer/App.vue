<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const accounts = ref([]);
const selectedAccountId = ref('');

const email = ref('');
const password = ref('');
const isConnecting = ref(false);
const isDownloading = ref(false);
const status = ref('');
const progress = ref('');
const result = ref(null);
const passwordType = ref('password');

const showAccountModal = ref(false);
const newAccountEmail = ref('');
const newAccountPassword = ref('');

let unsubscribeProgress = null;

onMounted(async () => {
  // 加载账号列表
  try {
    const res = await window.electronAPI.account.list();
    accounts.value = Array.isArray(res) ? res : [];
    if (accounts.value.length > 0) {
      selectedAccountId.value = accounts.value[0].id;
      email.value = accounts.value[0].email;
      password.value = accounts.value[0].password;
    }
  } catch (e) {
    console.error('加载账号列表失败:', e);
  }

  // 监听下载进度
  unsubscribeProgress = window.electronAPI.email.onProgress((data) => {
    if (data.status === 'searching') {
      progress.value = `正在搜索未读邮件... 找到 ${data.total} 封`;
    } else if (data.status === 'downloading') {
      progress.value = `正在下载: ${data.filename} (${data.current}/${data.total})`;
    }
  });
});

onUnmounted(() => {
  if (unsubscribeProgress) {
    unsubscribeProgress();
  }
});

const togglePasswordVisibility = () => {
  passwordType.value = passwordType.value === 'password' ? 'text' : 'password';
};

const connectAndDownload = async () => {
  const account = accounts.value.find(a => a.id === selectedAccountId.value);
  if (!account) {
    status.value = '请先选择一个账号，或新增账号';
    return;
  }

  email.value = account.email;
  password.value = account.password;

  if (!email.value || !password.value) {
    status.value = '账号信息不完整，请重新编辑账号';
    return;
  }

  isConnecting.value = true;
  status.value = '正在连接邮箱...';
  progress.value = '';
  result.value = null;

  try {
    // 连接邮箱
    const connectResult = await window.electronAPI.email.connect(email.value, password.value);
    
    if (!connectResult.success) {
      status.value = `连接失败: ${connectResult.message}`;
      isConnecting.value = false;
      return;
    }

    status.value = '连接成功，开始下载附件...';
    isDownloading.value = true;

    // 下载附件
    const downloadResult = await window.electronAPI.email.download();
    
    if (downloadResult.success) {
      result.value = downloadResult;
      if (downloadResult.attachmentsCount === 0) {
        status.value = `处理完成：检查了 ${downloadResult.totalEmails} 封未读邮件，未找到附件`;
      } else {
        status.value = `下载完成！共处理 ${downloadResult.totalEmails} 封邮件，下载了 ${downloadResult.attachmentsCount} 个附件`;
      }
    } else {
      status.value = `下载失败: ${downloadResult.message}`;
    }
  } catch (error) {
    status.value = `错误: ${error.message}`;
  } finally {
    isConnecting.value = false;
    isDownloading.value = false;
    progress.value = '';
  }
};

const openDownloadFolder = async () => {
  if (result.value && result.value.downloadPath) {
    const openResult = await window.electronAPI.openPath(result.value.downloadPath);
    if (!openResult.success) {
      alert(`打开文件夹失败: ${openResult.message}`);
    }
  }
};

const openAccountModal = () => {
  newAccountEmail.value = '';
  newAccountPassword.value = '';
  showAccountModal.value = true;
};

const cancelAccountModal = () => {
  showAccountModal.value = false;
};

const saveAccount = async () => {
  if (!newAccountEmail.value || !newAccountPassword.value) {
    status.value = '请填写完整的账号信息';
    return;
  }

  try {
    const res = await window.electronAPI.account.add({
      label: newAccountEmail.value,
      email: newAccountEmail.value,
      password: newAccountPassword.value,
    });

    if (!res || !res.success) {
      status.value = `保存账号失败: ${res && res.message ? res.message : '未知错误'}`;
      return;
    }

    const created = res.data;
    accounts.value.push(created);
    selectedAccountId.value = created.id;
    email.value = created.email;
    password.value = created.password;

    showAccountModal.value = false;
    newAccountEmail.value = '';
    newAccountPassword.value = '';
  } catch (e) {
    status.value = `保存账号异常: ${e.message}`;
  }
};

const removeCurrentAccount = async () => {
  if (!selectedAccountId.value) {
    status.value = '当前没有可删除的账号';
    return;
  }

  if (!confirm('确定要删除当前选中的账号吗？')) {
    return;
  }

  try {
    const res = await window.electronAPI.account.remove(selectedAccountId.value);
    if (!res || !res.success) {
      status.value = `删除账号失败: ${res && res.message ? res.message : '未知错误'}`;
      return;
    }

    const idx = accounts.value.findIndex(a => a.id === selectedAccountId.value);
    if (idx !== -1) {
      accounts.value.splice(idx, 1);
    }

    if (accounts.value.length > 0) {
      selectedAccountId.value = accounts.value[0].id;
      email.value = accounts.value[0].email;
      password.value = accounts.value[0].password;
    } else {
      selectedAccountId.value = '';
      email.value = '';
      password.value = '';
    }
  } catch (e) {
    status.value = `删除账号异常: ${e.message}`;
  }
};
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>📧 邮箱附件下载器</h1>
      <p class="subtitle">下载所有未读邮件的附件</p>
    </div>

    <div class="form-container">
      <div class="form-group">
        <label for="account">选择账号</label>
        <select
          id="account"
          v-model="selectedAccountId"
          :disabled="isConnecting || isDownloading || accounts.length === 0"
        >
          <option
            v-if="accounts.length === 0"
            disabled
            value=""
          >
            暂无账号，请先新增
          </option>
          <option
            v-for="acc in accounts"
            :key="acc.id"
            :value="acc.id"
          >
            {{ acc.email }}
          </option>
        </select>
      </div>

      <div class="form-group account-actions">
        <button
          type="button"
          class="secondary-btn"
          @click="openAccountModal"
          :disabled="isConnecting || isDownloading"
        >
          新增账号
        </button>
        <button
          type="button"
          class="secondary-btn danger"
          @click="removeCurrentAccount"
          :disabled="isConnecting || isDownloading || !selectedAccountId"
        >
          删除当前账号
        </button>
      </div>

      <button
        class="download-btn"
        type="button"
        @click="connectAndDownload"
        :disabled="isConnecting || isDownloading"
      >
        {{ isConnecting || isDownloading ? '处理中...' : '开始下载附件' }}
      </button>
    </div>

    <div
      v-if="status"
      class="status-container"
    >
      <div
        class="status-message"
        :class="{ error: status.includes('失败') || status.includes('错误') }"
      >
        {{ status }}
      </div>
      <div
        v-if="progress"
        class="progress-message"
      >
        {{ progress }}
      </div>
    </div>

    <div
      v-if="showAccountModal"
      class="modal-backdrop"
    >
      <div class="modal">
        <h3>新增账号</h3>
        <div class="form-group">
          <label for="accountEmail">邮箱地址</label>
          <input
            id="accountEmail"
            v-model="newAccountEmail"
            type="email"
            placeholder="例如：example@qq.com 或 example@163.com"
          />
        </div>
        <div class="form-group">
          <label for="accountPassword">
            授权码
            <span class="help-text">（不是登录密码，需要在邮箱设置中开启 IMAP 并获取授权码/客户端专用密码）</span>
          </label>
          <div class="password-input">
            <input
              id="accountPassword"
              v-model="newAccountPassword"
              type="password"
              placeholder="输入授权码"
            />
          </div>
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="secondary-btn"
            @click="cancelAccountModal"
          >
            取消
          </button>
          <button
            type="button"
            class="download-btn"
            @click="saveAccount"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="result && result.success"
      class="result-container"
    >
      <h3>下载详情</h3>
      <div class="result-stats">
        <div class="stat-item">
          <span class="stat-label">未读邮件数:</span>
          <span class="stat-value">{{ result.totalEmails }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">附件数量:</span>
          <span class="stat-value">{{ result.attachmentsCount }}</span>
        </div>
      </div>
      <div
        v-if="result.attachmentsCount > 0"
        class="download-path"
      >
        <p><strong>保存位置:</strong></p>
        <code>{{ result.downloadPath }}</code>
        <button
          type="button"
          class="open-folder-btn"
          @click="openDownloadFolder"
        >
          📁 查看位置
        </button>
      </div>
    </div>

    <footer class="footer">
      <div class="author-info">
        <span class="author-text">作者：西牧</span>
        <span class="divider">|</span>
        <span class="wechat-text">微信：zxx960</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.subtitle {
  color: #7f8c8d;
  font-size: 18px;
}

.form-container {
  background: #f8f9fa;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 600;
  text-align: left;
}

.help-text {
  font-size: 12px;
  color: #95a5a6;
  font-weight: normal;
  text-align: left;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

.password-input {
  position: relative;
  display: flex;
  gap: 8px;
}

.password-input input {
  flex: 1;
}

.toggle-password {
  padding: 8px 16px;
  background: #fff;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  transition: background-color 0.3s;
}

.toggle-password:hover:not(:disabled) {
  background: #f0f0f0;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

.form-group input:disabled {
  background: #ecf0f1;
  cursor: not-allowed;
}

.form-group select {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

.form-group select:focus {
  outline: none;
  border-color: #3498db;
}

.form-group select:disabled {
  background: #ecf0f1;
  cursor: not-allowed;
}

.account-actions {
  display: flex;
  gap: 10px;
}

.secondary-btn {
  padding: 10px 16px;
  background: #ffffff;
  border: 1px solid #ced4da;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s, border-color 0.3s;
  white-space: nowrap;
  text-align: center;
}

.secondary-btn:hover:not(:disabled) {
  background: #f1f3f5;
  border-color: #adb5bd;
}

.secondary-btn:disabled {
  background: #e9ecef;
  cursor: not-allowed;
}

.secondary-btn.danger {
  color: #e03131;
  border-color: #ffa8a8;
}

.secondary-btn.danger:hover:not(:disabled) {
  background: #ffe3e3;
  border-color: #ff8787;
}

.download-btn {
  width: 100%;
  padding: 14px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.download-btn:hover:not(:disabled) {
  background: #2980b9;
}

.download-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.status-container {
  margin: 20px 0;
}

.status-message {
  padding: 15px;
  background: #d5f4e6;
  border-left: 4px solid #27ae60;
  border-radius: 4px;
  color: #27ae60;
  margin-bottom: 10px;
}

.status-message.error {
  background: #fadbd8;
  border-left-color: #e74c3c;
  color: #e74c3c;
}

.progress-message {
  padding: 12px;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
  color: #856404;
}

.result-container {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.result-container h3 {
  margin-top: 0;
  color: #2c3e50;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  background: white;
  padding: 15px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-label {
  color: #7f8c8d;
  font-size: 13px;
}

.stat-value {
  color: #2c3e50;
  font-size: 24px;
  font-weight: bold;
}

.download-path {
  margin-top: 15px;
}

.download-path code {
  display: block;
  background: white;
  padding: 12px;
  border-radius: 6px;
  margin: 10px 0;
  word-break: break-all;
  font-size: 13px;
  color: #2c3e50;
}

.open-folder-btn {
  padding: 10px 20px;
  background: #2ecc71;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.open-folder-btn:hover {
  background: #27ae60;
}

.footer {
  margin-top: 40px;
  padding: 20px 0;
  border-top: 1px solid #e9ecef;
  text-align: center;
}

.author-info {
  color: #6c757d;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.author-text,
.wechat-text {
  transition: color 0.3s ease;
}

.author-text:hover,
.wechat-text:hover {
  color: #3498db;
}

.divider {
  color: #dee2e6;
  font-weight: 300;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #ffffff;
  padding: 24px;
  border-radius: 12px;
  width: 420px;
  max-width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.modal h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #2c3e50;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
}

.modal-actions .secondary-btn,
.modal-actions .download-btn {
  flex: 1;
}

</style>
