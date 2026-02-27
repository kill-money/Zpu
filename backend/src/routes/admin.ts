import express from 'express';
import { 
  getDashboard,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  resetUserPassword,
  setSocketIO
} from '../controllers/adminController';
import { 
  authenticateToken, 
  requireMFA,
  logAPIAccess
} from '../middleware/auth';

const router = express.Router();

// Apply API access logging to all admin routes
router.use(logAPIAccess);

// All admin routes require authentication and admin role
router.use(authenticateToken);

// Admin role validation middleware
const requireAdminRole = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'INSUFFICIENT_PRIVILEGES'
    });
  }
  next();
};

router.use(requireAdminRole);

// Dashboard Routes
router.get('/dashboard', getDashboard);

// User Management Routes
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);
router.post('/users', createUser);
router.put('/users/:userId', updateUser);
router.put('/users/:userId/status', updateUserStatus);
router.delete('/users/:userId', deleteUser);

// Security Operations (require MFA)
router.post('/users/:userId/reset-password', requireMFA, resetUserPassword);

export { setSocketIO };
export default router;
