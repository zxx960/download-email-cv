const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class EmailHandler {
  constructor() {
    this.imap = null;
    this.downloadPath = null; // 每次下载时动态创建
  }

  // 创建带时间戳的下载文件夹
  createDownloadFolder() {
    const now = new Date();
    const timestamp = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    
    const folderName = `EmailAttachments_${timestamp}`;
    this.downloadPath = path.join(app.getPath('downloads'), folderName);
    
    // 创建文件夹
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
    }
    
    return this.downloadPath;
  }

  // 连接到QQ邮箱
  connect(email, password) {
    return new Promise((resolve, reject) => {
      this.imap = new Imap({
        user: email,
        password: password,
        host: 'imap.qq.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      this.imap.once('ready', () => {
        console.log('IMAP连接成功');
        resolve({ success: true, message: '连接成功' });
      });

      this.imap.once('error', (err) => {
        console.error('IMAP连接错误:', err);
        reject({ success: false, message: `连接失败: ${err.message}` });
      });

      this.imap.once('end', () => {
        console.log('IMAP连接已关闭');
      });

      this.imap.connect();
    });
  }

  // 获取未读邮件并下载附件
  downloadUnreadAttachments(progressCallback) {
    return new Promise((resolve, reject) => {
      if (!this.imap) {
        reject({ success: false, message: '未连接到邮箱' });
        return;
      }

      this.imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject({ success: false, message: `打开收件箱失败: ${err.message}` });
          return;
        }

        // 搜索未读邮件
        this.imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            reject({ success: false, message: `搜索邮件失败: ${err.message}` });
            return;
          }

          if (!results || results.length === 0) {
            resolve({ 
              success: true, 
              message: '没有未读邮件', 
              totalEmails: 0,
              attachmentsCount: 0,
              downloadedFiles: []
            });
            return;
          }

          console.log(`找到 ${results.length} 封未读邮件`);
          
          // 创建带时间戳的下载文件夹
          const downloadPath = this.createDownloadFolder();
          console.log(`下载文件夹: ${downloadPath}`);
          
          progressCallback({ status: 'searching', total: results.length });

          const downloadedFiles = [];
          let processedCount = 0;
          let attachmentsCount = 0;

          const fetch = this.imap.fetch(results, { bodies: '', markSeen: false });

          fetch.on('message', (msg, seqno) => {
            let hasAttachments = false;
            let messageUid = null;

            msg.once('attributes', (attrs) => {
              messageUid = attrs.uid;
            });

            msg.on('body', (stream, info) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) {
                  console.error('解析邮件失败:', err);
                  return;
                }

                console.log(`邮件 #${seqno}: ${parsed.subject}`);
                
                // 检查是否有附件
                if (parsed.attachments && parsed.attachments.length > 0) {
                  hasAttachments = true;
                  console.log(`  找到 ${parsed.attachments.length} 个附件`);

                  // 下载每个附件
                  for (const attachment of parsed.attachments) {
                    const filename = attachment.filename || `attachment_${Date.now()}`;
                    const filepath = path.join(this.downloadPath, filename);
                    
                    try {
                      // 如果文件已存在，添加时间戳
                      let finalPath = filepath;
                      if (fs.existsSync(finalPath)) {
                        const ext = path.extname(filename);
                        const basename = path.basename(filename, ext);
                        finalPath = path.join(this.downloadPath, `${basename}_${Date.now()}${ext}`);
                      }

                      fs.writeFileSync(finalPath, attachment.content);
                      console.log(`  ✓ 已保存: ${filename}`);
                      downloadedFiles.push(finalPath);
                      attachmentsCount++;
                      
                      progressCallback({ 
                        status: 'downloading', 
                        current: processedCount + 1,
                        total: results.length,
                        filename: filename
                      });
                    } catch (writeErr) {
                      console.error(`保存附件失败: ${filename}`, writeErr);
                    }
                  }

                  // 下载完附件后，标记邮件为已读
                  if (messageUid) {
                    this.imap.addFlags(messageUid, ['\\Seen'], (err) => {
                      if (err) {
                        console.error(`标记邮件 #${seqno} 为已读失败:`, err);
                      } else {
                        console.log(`  ✓ 邮件 #${seqno} 已标记为已读`);
                      }
                    });
                  }
                } else {
                  console.log('  没有附件');
                }

                processedCount++;
                
                // 所有邮件处理完成
                if (processedCount === results.length) {
                  resolve({
                    success: true,
                    message: '附件下载完成',
                    totalEmails: results.length,
                    attachmentsCount: attachmentsCount,
                    downloadedFiles: downloadedFiles,
                    downloadPath: this.downloadPath
                  });
                }
              });
            });
          });

          fetch.once('error', (err) => {
            reject({ success: false, message: `获取邮件失败: ${err.message}` });
          });

          fetch.once('end', () => {
            console.log('所有邮件已处理');
          });
        });
      });
    });
  }

  // 断开连接
  disconnect() {
    if (this.imap) {
      this.imap.end();
      this.imap = null;
    }
  }
}

module.exports = EmailHandler;
