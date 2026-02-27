import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { Loan } from '../models/Loan';
import { Application } from '../models/Application';
import { ComplianceLog } from '../models/ComplianceLog';
import { logComplianceEvent } from '../middleware/compliance';

interface AuthenticatedSocket extends Socket {
  user: any;
}

// 实时审批处理器
export class ApprovalSocketHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  // 初始化Socket处理器
  initialize() {
    this.io.use(this.authenticateSocket.bind(this));
    
    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      console.log(`User connected: ${authSocket.user.email} (${authSocket.user.role})`);
      
      // 将用户加入对应的房间
      if (authSocket.user.role === 'admin') {
        authSocket.join('admin-room');
        authSocket.join(`admin-${authSocket.user._id}`);
      } else {
        authSocket.join(`user-${authSocket.user._id}`);
      }

      // 管理员专用事件处理
      if (authSocket.user.role === 'admin') {
        this.setupAdminEvents(authSocket);
      }
      
      // 用户通用事件处理
      this.setupUserEvents(authSocket);

      authSocket.on('disconnect', () => {
        console.log(`User disconnected: ${authSocket.user.email}`);
      });
    });
  }

  // Socket认证中间件
  private async authenticateSocket(socket: Socket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      (socket as AuthenticatedSocket).user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  }

  // 设置管理员事件处理
  private setupAdminEvents(socket: AuthenticatedSocket) {
    // 审批贷款申请
    socket.on('approve_loan', async (data: { 
      loanId: string; 
      approvalData: any; 
      notes?: string 
    }) => {
      try {
        await this.approveLoan(socket, data);
      } catch (error) {
        socket.emit('approval_error', {
          error: 'Failed to approve loan',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 拒绝贷款申请
    socket.on('reject_loan', async (data: { 
      loanId: string; 
      rejectionReason: string; 
      adverseActionRequired?: boolean 
    }) => {
      try {
        await this.rejectLoan(socket, data);
      } catch (error) {
        socket.emit('rejection_error', {
          error: 'Failed to reject loan',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 请求更多文档
    socket.on('request_documents', async (data: { 
      loanId: string; 
      documentsRequired: string[]; 
      deadline?: Date 
    }) => {
      try {
        await this.requestDocuments(socket, data);
      } catch (error) {
        socket.emit('document_request_error', {
          error: 'Failed to request documents',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 更新贷款条款
    socket.on('update_loan_terms', async (data: { 
      loanId: string; 
      newTerms: any 
    }) => {
      try {
        await this.updateLoanTerms(socket, data);
      } catch (error) {
        socket.emit('terms_update_error', {
          error: 'Failed to update loan terms',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 批量操作
    socket.on('batch_approve', async (data: { loanIds: string[]; approvalData: any }) => {
      try {
        await this.batchApproveLoans(socket, data);
      } catch (error) {
        socket.emit('batch_approval_error', {
          error: 'Failed to batch approve loans',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 发送系统通知
    socket.on('send_notification', async (data: { 
      userId?: string; 
      message: string; 
      type: 'info' | 'warning' | 'error' | 'success' 
    }) => {
      try {
        await this.sendNotification(socket, data);
      } catch (error) {
        socket.emit('notification_error', {
          error: 'Failed to send notification',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  // 设置用户事件处理
  private setupUserEvents(socket: AuthenticatedSocket) {
    // 加入贷款申请房间
    socket.on('join_loan_room', (loanId: string) => {
      socket.join(`loan-${loanId}`);
      console.log(`User ${socket.user.email} joined loan room: ${loanId}`);
    });

    // 离开贷款申请房间
    socket.on('leave_loan_room', (loanId: string) => {
      socket.leave(`loan-${loanId}`);
      console.log(`User ${socket.user.email} left loan room: ${loanId}`);
    });

    // 获取实时状态
    socket.on('get_loan_status', async (loanId: string) => {
      try {
        const loan = await Loan.findById(loanId).populate('user');
        
        if (!loan || (loan.user as any)._id.toString() !== socket.user._id.toString()) {
          socket.emit('status_error', { error: 'Loan not found or access denied' });
          return;
        }

        socket.emit('loan_status_update', {
          loanId,
          status: loan.status,
          lastUpdated: loan.updatedAt,
          decision: loan.decision
        });
      } catch (error) {
        socket.emit('status_error', {
          error: 'Failed to get loan status',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  // 审批贷款
  private async approveLoan(socket: AuthenticatedSocket, data: { 
    loanId: string; 
    approvalData: any; 
    notes?: string 
  }) {
    const loan = await Loan.findById(data.loanId).populate('user application');
    
    if (!loan) {
      throw new Error('Loan not found');
    }

    // 更新贷款状态
    loan.status = 'approved';
    loan.decision = {
      approvedBy: socket.user._id,
      approvedAt: new Date(),
      decision: 'approved',
      notes: data.notes,
      terms: data.approvalData.terms,
      conditions: data.approvalData.conditions
    };
    
    // 设置最终贷款条款
    if (data.approvalData.finalAmount) {
      loan.amount = data.approvalData.finalAmount;
    }
    if (data.approvalData.finalRate) {
      loan.interestRate = data.approvalData.finalRate;
    }
    if (data.approvalData.finalTerm) {
      loan.term = data.approvalData.finalTerm;
    }

    await loan.save();

    // 记录合规日志
    await logComplianceEvent({
      user: (loan.user as any)._id,
      eventType: 'LOAN_APPROVED',
      regulationType: 'FCRA',
      data: {
        loanId: loan._id,
        approvedBy: socket.user._id,
        finalTerms: {
          amount: loan.amount,
          interestRate: loan.interestRate,
          term: loan.term
        }
      },
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    });

    // 通知用户
    this.io.to(`user-${(loan.user as any)._id}`).emit('loan_approved', {
      loanId: loan._id,
      message: '恭喜！您的贷款申请已获批准',
      terms: loan.decision.terms,
      nextSteps: '我们将在1个工作日内联系您完成资金发放流程'
    });

    // 通知管理员
    this.io.to('admin-room').emit('loan_approval_completed', {
      loanId: loan._id,
      approvedBy: socket.user.email,
      approvalTime: new Date(),
      loanDetails: {
        amount: loan.amount,
        interestRate: loan.interestRate,
        term: loan.term,
        user: {
          name: `${(loan.user as any).firstName} ${(loan.user as any).lastName}`,
          email: (loan.user as any).email
        }
      }
    });

    socket.emit('approval_success', {
      loanId: loan._id,
      message: 'Loan approved successfully'
    });
  }

  // 拒绝贷款
  private async rejectLoan(socket: AuthenticatedSocket, data: { 
    loanId: string; 
    rejectionReason: string; 
    adverseActionRequired?: boolean 
  }) {
    const loan = await Loan.findById(data.loanId).populate('user');
    
    if (!loan) {
      throw new Error('Loan not found');
    }

    // 更新贷款状态
    loan.status = 'rejected';
    loan.decision = {
      approvedBy: socket.user._id,
      approvedAt: new Date(),
      decision: 'rejected',
      rejectionReason: data.rejectionReason,
      adverseActionRequired: data.adverseActionRequired
    };

    await loan.save();

    // 记录合规日志 - ECOA要求
    await logComplianceEvent({
      user: (loan.user as any)._id,
      eventType: 'LOAN_REJECTED',
      regulationType: 'ECOA',
      data: {
        loanId: loan._id,
        rejectedBy: socket.user._id,
        rejectionReason: data.rejectionReason,
        adverseActionRequired: data.adverseActionRequired
      },
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    });

    // 通知用户
    this.io.to(`user-${(loan.user as any)._id}`).emit('loan_rejected', {
      loanId: loan._id,
      message: '很抱歉，您的贷款申请未能获批',
      reason: data.rejectionReason,
      adverseActionNotice: data.adverseActionRequired,
      nextSteps: '您将收到详细的拒绝原因说明邮件，可在30天后重新申请'
    });

    // 通知管理员
    this.io.to('admin-room').emit('loan_rejection_completed', {
      loanId: loan._id,
      rejectedBy: socket.user.email,
      rejectionTime: new Date(),
      reason: data.rejectionReason
    });

    socket.emit('rejection_success', {
      loanId: loan._id,
      message: 'Loan rejected successfully'
    });
  }

  // 请求文档
  private async requestDocuments(socket: AuthenticatedSocket, data: { 
    loanId: string; 
    documentsRequired: string[]; 
    deadline?: Date 
  }) {
    const loan = await Loan.findById(data.loanId).populate('user');
    
    if (!loan) {
      throw new Error('Loan not found');
    }

    // 更新贷款状态
    loan.status = 'pending_documents';
    loan.documentsRequired = data.documentsRequired;
    loan.documentDeadline = data.deadline;
    
    await loan.save();

    // 通知用户
    this.io.to(`user-${(loan.user as any)._id}`).emit('documents_requested', {
      loanId: loan._id,
      message: '我们需要您提供额外的文档来完成审核',
      documentsRequired: data.documentsRequired,
      deadline: data.deadline,
      uploadInstructions: '请登录您的账户上传所需文档'
    });

    socket.emit('document_request_success', {
      loanId: loan._id,
      message: 'Document request sent successfully'
    });
  }

  // 更新贷款条款
  private async updateLoanTerms(socket: AuthenticatedSocket, data: { 
    loanId: string; 
    newTerms: any 
  }) {
    const loan = await Loan.findById(data.loanId).populate('user');
    
    if (!loan) {
      throw new Error('Loan not found');
    }

    // 保存原始条款用于合规记录
    const originalTerms = {
      amount: loan.amount,
      interestRate: loan.interestRate,
      term: loan.term
    };

    // 更新条款
    if (data.newTerms.amount) loan.amount = data.newTerms.amount;
    if (data.newTerms.interestRate) loan.interestRate = data.newTerms.interestRate;
    if (data.newTerms.term) loan.term = data.newTerms.term;

    loan.status = 'terms_updated';
    await loan.save();

    // 记录合规日志 - TILA要求
    await logComplianceEvent({
      user: (loan.user as any)._id,
      eventType: 'LOAN_TERMS_UPDATED',
      regulationType: 'TILA',
      data: {
        loanId: loan._id,
        updatedBy: socket.user._id,
        originalTerms,
        newTerms: {
          amount: loan.amount,
          interestRate: loan.interestRate,
          term: loan.term
        }
      },
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    });

    // 通知用户
    this.io.to(`user-${(loan.user as any)._id}`).emit('loan_terms_updated', {
      loanId: loan._id,
      message: '您的贷款条款已更新',
      newTerms: data.newTerms,
      requiresApproval: true,
      approvalDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后
    });

    socket.emit('terms_update_success', {
      loanId: loan._id,
      message: 'Loan terms updated successfully'
    });
  }

  // 批量批准贷款
  private async batchApproveLoans(socket: AuthenticatedSocket, data: { 
    loanIds: string[]; 
    approvalData: any 
  }) {
    const results = [];
    
    for (const loanId of data.loanIds) {
      try {
        await this.approveLoan(socket, {
          loanId,
          approvalData: data.approvalData,
          notes: `批量批准 - ${new Date().toISOString()}`
        });
        results.push({ loanId, status: 'approved' });
      } catch (error) {
        results.push({ 
          loanId, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    socket.emit('batch_approval_completed', {
      results,
      totalProcessed: data.loanIds.length,
      successCount: results.filter(r => r.status === 'approved').length,
      errorCount: results.filter(r => r.status === 'error').length
    });
  }

  // 发送系统通知
  private async sendNotification(socket: AuthenticatedSocket, data: { 
    userId?: string; 
    message: string; 
    type: 'info' | 'warning' | 'error' | 'success' 
  }) {
    const notification = {
      message: data.message,
      type: data.type,
      from: 'system',
      timestamp: new Date()
    };

    if (data.userId) {
      // 发送给特定用户
      this.io.to(`user-${data.userId}`).emit('system_notification', notification);
    } else {
      // 发送给所有用户
      this.io.emit('system_notification', notification);
    }

    socket.emit('notification_sent', {
      message: 'Notification sent successfully',
      recipients: data.userId ? 1 : 'all'
    });
  }

  // 广播系统状态更新
  broadcastSystemStatus(status: { 
    maintenance?: boolean; 
    message?: string; 
    affectedServices?: string[] 
  }) {
    this.io.emit('system_status_update', {
      ...status,
      timestamp: new Date()
    });
  }

  // 发送实时统计更新给管理员
  broadcastStatsUpdate(stats: any) {
    this.io.to('admin-room').emit('dashboard_stats_update', {
      ...stats,
      timestamp: new Date()
    });
  }
}