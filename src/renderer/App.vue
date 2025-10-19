<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const email = ref('');
const password = ref('');
const isConnecting = ref(false);
const isDownloading = ref(false);
const status = ref('');
const progress = ref('');
const result = ref(null);
const passwordType = ref('password');

let unsubscribeProgress = null;

onMounted(() => {
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
  if (!email.value || !password.value) {
    status.value = '请输入邮箱地址和授权码';
    return;
  }

  isConnecting.value = true;
  status.value = '正在连接QQ邮箱...';
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
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>📧 QQ邮箱附件下载器</h1>
      <p class="subtitle">下载所有未读邮件的附件</p>
    </div>

    <div class="form-container">
      <div class="form-group">
        <label for="email">QQ邮箱地址</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="example@qq.com"
          :disabled="isConnecting || isDownloading"
        />
      </div>

      <div class="form-group">
        <label for="password">
          授权码
          <span class="help-text">（非QQ密码，需在QQ邮箱设置中获取）</span>
        </label>
        <div class="password-input">
          <input
            id="password"
            v-model="password"
            :type="passwordType"
            placeholder="输入授权码"
            :disabled="isConnecting || isDownloading"
          />
          <button 
            type="button" 
            class="toggle-password" 
            @click="togglePasswordVisibility"
            :disabled="isConnecting || isDownloading"
          >
            {{ passwordType === 'password' ? '👁️' : '🙈' }}
          </button>
        </div>
      </div>

      <button
        class="download-btn"
        @click="connectAndDownload"
        :disabled="isConnecting || isDownloading"
      >
        {{ isConnecting || isDownloading ? '处理中...' : '开始下载附件' }}
      </button>
    </div>

    <div v-if="status" class="status-container">
      <div class="status-message" :class="{ error: status.includes('失败') || status.includes('错误') }">
        {{ status }}
      </div>
      <div v-if="progress" class="progress-message">
        {{ progress }}
      </div>
    </div>

    <div v-if="result && result.success" class="result-container">
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
      <div v-if="result.attachmentsCount > 0" class="download-path">
        <p><strong>保存位置:</strong></p>
        <code>{{ result.downloadPath }}</code>
        <button class="open-folder-btn" @click="openDownloadFolder">
          📁 查看位置
        </button>
      </div>
    </div>
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
  font-size: 14px;
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
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 600;
}

.help-text {
  font-size: 12px;
  color: #95a5a6;
  font-weight: normal;
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
</style>
