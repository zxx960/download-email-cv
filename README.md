<div align="center"> 

# 📧 QQ邮箱附件下载器

基于 **Electron** + **Vue3** 开发的桌面应用，用于自动下载QQ邮箱中所有未读邮件的附件。

</div>

## ✨ 功能特点

- 🔐 **安全连接** - 使用IMAP协议安全连接QQ邮箱
- 📮 **未读邮件** - 自动检测所有未读邮件
- 📎 **智能识别** - 自动判断邮件是否包含附件
- ⬇️ **批量下载** - 一键下载所有附件到本地
- ✅ **自动标记** - 下载完成后自动标记邮件为已读
- 💾 **本地保存** - 记住邮箱账号和授权码
- 📊 **实时进度** - 显示下载进度和状态

## 🚀 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vue 3** - 渐进式JavaScript框架
- **ViteJS** - 下一代前端构建工具
- **imap** - IMAP协议客户端
- **mailparser** - 邮件解析库
- **Electron Builder** - 应用打包工具

## 📦 安装和使用

### 1️⃣ 克隆项目

```bash
git clone https://github.com/zxx960/download-email-cv.git
cd download-email-cv
```

### 2️⃣ 安装依赖

```bash
npm install
```

### 3️⃣ 获取QQ邮箱授权码

1. 登录 [QQ邮箱网页版](https://mail.qq.com)
2. 点击顶部 **"设置"** → **"账户"**
3. 找到 **"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"**
4. 开启 **"IMAP/SMTP服务"**
5. 按照提示发送短信或扫码验证
6. 生成授权码（16位字符串），请妥善保存

> ⚠️ **注意**：授权码不是QQ密码！

### 4️⃣ 启动应用

#### 开发模式

```bash
npm run dev
```

#### 打包应用

```bash
npm run build        # 自动识别当前系统
npm run build:win    # 打包Windows版本
npm run build:mac    # 打包macOS版本
npm run build:linux  # 打包Linux版本
```

打包后的应用在 `dist` 目录中。

## 📖 使用说明

1. 启动应用后，输入你的QQ邮箱地址（如：123456@qq.com）
2. 输入刚才获取的授权码
3. 点击 **"开始下载附件"** 按钮
4. 等待下载完成，附件将保存在带时间戳的文件夹中
5. 下载完成的邮件会自动标记为已读

## 📂 附件保存位置

每次下载会自动创建一个带时间戳的新文件夹，格式为：`EmailAttachments_YYYYMMDD_HHMMSS`

例如：
- **Windows**: `C:\Users\你的用户名\Downloads\EmailAttachments_20250120_162035\`
- **macOS**: `~/Downloads/EmailAttachments_20250120_162035/`
- **Linux**: `~/Downloads/EmailAttachments_20250120_162035/`

> 💡 **提示**：每次下载都会创建新文件夹，方便管理不同批次的附件

## 📁 项目结构

```bash
download-email-cv/
├── src/
│   ├── main/                    # 主进程
│   │   ├── main.js             # 主进程入口
│   │   ├── preload.js          # 预加载脚本
│   │   └── emailHandler.js     # 邮件处理核心模块
│   └── renderer/                # 渲染进程
│       ├── App.vue             # 主应用组件
│       ├── main.js             # 渲染进程入口
│       └── style.css           # 全局样式
├── scripts/                     # 构建脚本
├── package.json                 # 项目配置
└── README.md                    # 说明文档
```

## ⚙️ 核心模块说明

### emailHandler.js
处理邮箱连接、邮件检索和附件下载的核心模块：
- 连接QQ邮箱IMAP服务
- 搜索未读邮件
- 解析邮件内容
- 下载附件到本地
- 标记邮件为已读

### App.vue
用户界面组件：
- 邮箱账号和授权码输入
- 下载进度实时显示
- 结果统计展示
- localStorage存储账号信息

## ❓ 常见问题

### Q: 连接失败怎么办？
**A:** 
- 检查邮箱地址是否正确
- 检查授权码是否正确（不是QQ密码）
- 确保已开启IMAP服务
- 检查网络连接

### Q: 为什么有些邮件没有下载附件？
**A:** 应用只下载包含附件的邮件，没有附件的邮件会跳过

### Q: 已下载的邮件会重复下载吗？
**A:** 不会。下载完成后邮件会自动标记为已读，下次不会再下载

### Q: 如何清除保存的账号信息？
**A:** 手动清空输入框，或在浏览器控制台执行：
```javascript
localStorage.removeItem('qq_email');
localStorage.removeItem('qq_auth_code');
```

## 🔒 安全说明

- 授权码保存在本地 localStorage 中
- 不会上传到任何服务器
- 建议定期更换授权码
- 不要分享授权码给他人

## 📄 开源协议

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 👨‍💻 作者

基于 [Electron Vue Template](https://github.com/Deluze/electron-vue-template) 开发
