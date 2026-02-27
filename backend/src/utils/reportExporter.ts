import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import fs from 'fs';
import path from 'path';

// Excel 导出工具类
export class ExcelExporter {
  private workbook: ExcelJS.Workbook;
  
  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'ZPU Loan Management System';
    this.workbook.created = new Date();
  }

  // 导出用户数据到Excel
  async exportUsers(users: any[]): Promise<Buffer> {
    const worksheet = this.workbook.addWorksheet('用户数据');

    // 设置列头
    worksheet.columns = [
      { header: '用户ID', key: 'id', width: 20 },
      { header: '姓名', key: 'name', width: 20 },
      { header: '邮箱', key: 'email', width: 30 },
      { header: '电话', key: 'phone', width: 15 },
      { header: '信用分数', key: 'creditScore', width: 12 },
      { header: '状态', key: 'status', width: 10 },
      { header: '注册时间', key: 'createdAt', width: 20 },
      { header: '最后登录', key: 'lastLogin', width: 20 },
      { header: '贷款总数', key: 'totalLoans', width: 12 },
      { header: '总借款金额', key: 'totalAmount', width: 15 }
    ];

    // 设置标题行样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // 添加数据
    users.forEach((user, index) => {
      const row = worksheet.addRow({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phoneNumber || 'N/A',
        creditScore: user.creditScore || 'N/A',
        status: user.isActive ? '活跃' : '非活跃',
        createdAt: user.createdAt?.toLocaleDateString() || 'N/A',
        lastLogin: user.lastLogin?.toLocaleDateString() || '从未登录',
        totalLoans: user.loanCount || 0,
        totalAmount: user.totalLoanAmount ? `$${user.totalLoanAmount.toLocaleString()}` : '$0'
      });

      // 奇偶行着色
      if (index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F9FA' }
        };
      }
    });

    // 添加边框
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    return await this.workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  // 导出贷款数据到Excel
  async exportLoans(loans: any[]): Promise<Buffer> {
    const worksheet = this.workbook.addWorksheet('贷款数据');

    worksheet.columns = [
      { header: '贷款ID', key: 'id', width: 20 },
      { header: '用户姓名', key: 'userName', width: 20 },
      { header: '用户邮箱', key: 'userEmail', width: 30 },
      { header: '贷款类型', key: 'type', width: 15 },
      { header: '贷款金额', key: 'amount', width: 15 },
      { header: '利率', key: 'interestRate', width: 10 },
      { header: '期限(月)', key: 'term', width: 12 },
      { header: '月供', key: 'monthlyPayment', width: 15 },
      { header: '状态', key: 'status', width: 15 },
      { header: '申请时间', key: 'appliedAt', width: 20 },
      { header: '批准时间', key: 'approvedAt', width: 20 },
      { header: '风险等级', key: 'riskLevel', width: 12 }
    ];

    // 设置标题行样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '28a745' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // 添加数据
    loans.forEach((loan, index) => {
      const user = loan.user || {};
      const row = worksheet.addRow({
        id: loan._id,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
        userEmail: user.email || 'N/A',
        type: loan.type || 'personal',
        amount: `$${(loan.amount || 0).toLocaleString()}`,
        interestRate: loan.interestRate ? `${loan.interestRate}%` : 'N/A',
        term: loan.term || 'N/A',
        monthlyPayment: loan.monthlyPayment ? `$${loan.monthlyPayment.toLocaleString()}` : 'N/A',
        status: this.translateLoanStatus(loan.status),
        appliedAt: loan.createdAt?.toLocaleDateString() || 'N/A',
        approvedAt: loan.decision?.approvedAt?.toLocaleDateString() || 'N/A',
        riskLevel: loan.riskAssessment?.riskLevel || 'N/A'
      });

      // 根据贷款状态着色
      const statusColor = this.getLoanStatusColor(loan.status);
      if (statusColor) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: statusColor }
        };
      }
    });

    // 添加边框
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    return await this.workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  // 导出合规日志到Excel  
  async exportComplianceLogs(logs: any[]): Promise<Buffer> {
    const worksheet = this.workbook.addWorksheet('合规日志');

    worksheet.columns = [
      { header: '记录ID', key: 'id', width: 20 },
      { header: '用户ID', key: 'userId', width: 20 },
      { header: '事件类型', key: 'eventType', width: 20 },
      { header: '法规类型', key: 'regulationType', width: 15 },
      { header: '描述', key: 'description', width: 40 },
      { header: '数据', key: 'data', width: 30 },
      { header: 'IP地址', key: 'ipAddress', width: 15 },
      { header: '用户代理', key: 'userAgent', width: 30 },
      { header: '时间戳', key: 'timestamp', width: 20 },
      { header: '保留期限', key: 'retentionDate', width: 20 }
    ];

    // 设置标题行样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'dc3545' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // 添加数据
    logs.forEach((log, index) => {
      worksheet.addRow({
        id: log._id,
        userId: log.user || 'N/A',
        eventType: log.eventType,
        regulationType: log.regulationType,
        description: log.description,
        data: JSON.stringify(log.data || {}).substring(0, 100),
        ipAddress: log.ipAddress || 'N/A',
        userAgent: (log.userAgent || '').substring(0, 50),
        timestamp: log.timestamp?.toLocaleString() || 'N/A',
        retentionDate: log.retentionDate?.toLocaleDateString() || 'N/A'
      });
    });

    return await this.workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  private translateLoanStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'draft': '草稿',
      'submitted': '已提交',
      'under_review': '审查中',
      'approved': '已批准',
      'rejected': '已拒绝',
      'funded': '已放款',
      'active': '还款中',
      'paid_off': '已还清',
      'defaulted': '违约',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  }

  private getLoanStatusColor(status: string): string | null {
    const colorMap: { [key: string]: string } = {
      'approved': 'C8E6C9',   // 淡绿色
      'rejected': 'FFCDD2',   // 淡红色
      'funded': 'BBDEFB',     // 淡蓝色
      'defaulted': 'FFCCCB',  // 红色
      'paid_off': 'C5E1A5'    // 绿色
    };
    return colorMap[status] || null;
  }
}

// PDF 导出工具类
export class PDFExporter {
  private doc: PDFKit.PDFDocument;
  
  constructor() {
    this.doc = new PDFDocument({ margin: 50 });
  }

  // 导出贷款报告PDF
  async generateLoanReport(loans: any[], summary: any): Promise<Buffer> {
    // 添加标题
    this.doc.fontSize(20).text('贷款管理系统报告', { align: 'center' });
    this.doc.moveDown();

    // 添加报告日期
    this.doc.fontSize(12).text(`报告生成日期: ${new Date().toLocaleDateString('zh-CN')}`, {
      align: 'right'
    });
    this.doc.moveDown();

    // 添加摘要
    this.doc.fontSize(16).text('贷款摘要', { underline: true });
    this.doc.moveDown(0.5);
    
    this.doc.fontSize(12);
    this.doc.text(`总贷款数量: ${summary.totalLoans || 0}`);
    this.doc.text(`总贷款金额: $${(summary.totalAmount || 0).toLocaleString()}`);
    this.doc.text(`平均贷款金额: $${(summary.averageAmount || 0).toLocaleString()}`);
    this.doc.text(`批准率: ${summary.approvalRate || 0}%`);
    this.doc.moveDown();

    // 添加贷款列表
    this.doc.fontSize(16).text('贷款详情', { underline: true });
    this.doc.moveDown(0.5);

    loans.slice(0, 50).forEach((loan, index) => {
      if (this.doc.y > 700) { // 换页
        this.doc.addPage();
      }

      const user = loan.user || {};
      this.doc.fontSize(10);
      this.doc.text(`${index + 1}. 贷款ID: ${loan._id}`, 50);
      this.doc.text(`   用户: ${user.firstName || ''} ${user.lastName || ''} (${user.email || 'N/A'})`, 50);
      this.doc.text(`   金额: $${(loan.amount || 0).toLocaleString()} | 利率: ${loan.interestRate || 'N/A'}% | 期限: ${loan.term || 'N/A'}月`, 50);
      this.doc.text(`   状态: ${this.translateLoanStatus(loan.status)} | 申请时间: ${loan.createdAt?.toLocaleDateString() || 'N/A'}`, 50);
      this.doc.moveDown(0.3);
    });

    // 添加页脚
    this.addFooter();

    this.doc.end();
    
    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      this.doc.on('data', buffers.push.bind(buffers));
      this.doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      this.doc.on('error', reject);
    });
  }

  // 导出合规报告PDF
  async generateComplianceReport(logs: any[], summary: any): Promise<Buffer> {
    // 添加标题
    this.doc.fontSize(20).text('合规审计报告', { align: 'center' });
    this.doc.moveDown();

    // 添加报告日期
    this.doc.fontSize(12).text(`报告生成日期: ${new Date().toLocaleDateString('zh-CN')}`, {
      align: 'right'
    });
    this.doc.moveDown();

    // 添加摘要
    this.doc.fontSize(16).text('合规摘要', { underline: true });
    this.doc.moveDown(0.5);
    
    this.doc.fontSize(12);
    this.doc.text(`总记录数: ${summary.totalLogs || 0}`);
    this.doc.text(`FCRA记录: ${summary.fcraLogs || 0}`);
    this.doc.text(`TCPA记录: ${summary.tcpaLogs || 0}`);
    this.doc.text(`TILA记录: ${summary.tilaLogs || 0}`);
    this.doc.text(`ECOA记录: ${summary.ecoaLogs || 0}`);
    this.doc.moveDown();

    // 添加合规事件列表
    this.doc.fontSize(16).text('合规事件详情', { underline: true });
    this.doc.moveDown(0.5);

    logs.slice(0, 30).forEach((log, index) => {
      if (this.doc.y > 700) { // 换页
        this.doc.addPage();
      }

      this.doc.fontSize(10);
      this.doc.text(`${index + 1}. ${log.eventType} (${log.regulationType})`, 50);
      this.doc.text(`   时间: ${log.timestamp?.toLocaleString() || 'N/A'}`, 50);
      this.doc.text(`   描述: ${log.description}`, 50);
      this.doc.text(`   用户: ${log.user || 'N/A'} | IP: ${log.ipAddress || 'N/A'}`, 50);
      this.doc.moveDown(0.3);
    });

    this.addFooter();
    this.doc.end();
    
    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      this.doc.on('data', buffers.push.bind(buffers));
      this.doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      this.doc.on('error', reject);
    });
  }

  private addFooter() {
    const pages = this.doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      this.doc.switchToPage(i);
      
      // 添加页码
      this.doc.fontSize(8).text(
        `第 ${i + 1} 页，共 ${pages.count} 页`,
        50,
        this.doc.page.height - 50,
        { align: 'center' }
      );
      
      // 添加生成信息
      this.doc.text(
        'ZPU贷款管理系统 - 机密文件',
        50,
        this.doc.page.height - 35,
        { align: 'center' }
      );
    }
  }

  private translateLoanStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'draft': '草稿',
      'submitted': '已提交',
      'under_review': '审查中',
      'approved': '已批准',
      'rejected': '已拒绝',
      'funded': '已放款',
      'active': '还款中',
      'paid_off': '已还清',
      'defaulted': '违约',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  }
}

// 导出工具函数
export class ReportExporter {
  // 发送Excel文件响应
  static async sendExcelResponse(res: Response, buffer: Buffer, filename: string) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  // 发送PDF文件响应
  static async sendPDFResponse(res: Response, buffer: Buffer, filename: string) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}