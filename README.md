# 🚀 US Loan H5 Application

Complete production-ready US market compliant loan application built with React 18 + Node.js + TypeScript.

## 🏗️ Tech Stack

**Frontend (H5 Single-Page Application)**
- React 18 + TypeScript + Vite
- React Router v6.4+ (file-based routing + code splitting)
- Zustand + persist (lightweight state, i18n-ready)
- Ant Design Mobile 5 (user side) + Ant Design 5 (admin side)
- React Hook Form + Zod (US SSN, address, phone validation)
- Socket.io v4 (real-time sync)
- react-i18next (en-US default, zh-CN, es-US support)

**Backend (Financial-Grade Security)**
- Node.js 20 + Express + TypeScript
- MongoDB (Mongoose) + Redis (cache, sessions, rate limiting)
- JWT + refresh token + httpOnly cookies
- Socket.io v4 (WebSocket + polling fallback)
- US compliance middleware (FCRA, TCPA, APR display)

**Deployment**
- Docker + Docker Compose (one-click local start)
- Production-ready with environment variables

## 🚀 Quick Start (One-Click)

### Method 1: Docker Compose (Recommended)
```bash
# Clone and start everything
git clone <repo-url>
cd us-loan-app
docker-compose up -d

# Access the app
# Frontend: http://localhost:5173
# Backend API: http://localhost:4000
# MongoDB: localhost:27017
# Redis: localhost:6379
```

### Method 2: Manual Development Setup
```bash
# 1. Backend
cd backend
npm install
cp .env.example .env  # Configure your environment
npm run dev           # Starts on port 4000

# 2. Frontend (new terminal)
cd ../frontend
npm install
npm run dev           # Starts on port 5173
```

## 📱 Features

### User Side (Mobile-First H5)
- **Authentication**: Register, Login, JWT + refresh tokens
- **Multi-step Loan Application**: US SSN, address, bank routing validation
- **Dashboard**: Real-time loan status, notifications
- **My Loans**: View all loans, repayment history
- **Repayment**: Online payment integration
- **Profile**: KYC, document upload, FCRA compliance

### Admin Portal
- **Full CRUD**: Users, Loans, Interest Rates, Reports
- **Real-time Approval**: Instant push to users via Socket.io
- **Export Features**: CSV/Excel loan reports
- **Compliance Tools**: FCRA disclosure, TCPA consent tracking
- **Rate Management**: APR calculator, regulatory display

### Real-time Sync
- Loan status changes (admin → user instantly)
- New application notifications (user → admin)
- Payment confirmations
- System alerts

## 🛡️ US Market Compliance

- **FCRA Compliance**: Credit check disclosures, adverse action notices
- **TCPA Consent**: SMS/call consent tracking
- **APR Display**: Truth in Lending Act compliance
- **Data Security**: Encrypted SSN storage, PCI-ready payment handling
- **Address Validation**: USPS-compatible formatting
- **Bank Routing**: ABA routing number validation

## 🌐 Internationalization

Default: English (en-US)
Ready: Chinese (zh-CN), Spanish (es-US)

```tsx
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation();
i18n.changeLanguage('zh-CN'); // Switch language
```

## 📁 Project Structure

```
us-loan-app/
├── frontend/                  # React 18 H5 SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── user/          # All user pages
│   │   │   └── admin/         # Admin portal
│   │   ├── components/        # Reusable components
│   │   ├── store/             # Zustand + Socket.io
│   │   ├── utils/             # Zod schemas, API client
│   │   └── i18n/              # Translations
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # Express routes
│   │   ├── controllers/       # Business logic
│   │   ├── middleware/        # Auth, rate limiting
│   │   └── sockets/           # Real-time events
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🔧 Environment Variables

```bash
# Backend (.env)
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/us_loan_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
STRIPE_SECRET_KEY=sk_test_...
PLAID_CLIENT_ID=your-plaid-id
PLAID_SECRET=your-plaid-secret
```

## 📊 API Examples

```bash
# User Authentication
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh

# Loan Application
POST /api/loans/apply
GET  /api/loans/my-loans
PUT  /api/loans/:id/repay

# Admin Operations
GET    /api/admin/loans
PATCH  /api/admin/loans/:id/approve
DELETE /api/admin/users/:id
```

## 🔥 Ready to Run!

The application is **production-ready** with:
- ✅ US regulatory compliance built-in
- ✅ Real-time sync between user & admin
- ✅ Mobile-first responsive design
- ✅ Financial-grade security (JWT, encryption)
- ✅ One-click Docker deployment
- ✅ Multi-language support (i18n)
- ✅ Complete CRUD operations
- ✅ Payment integration ready

**Start developing immediately** - all core functionality is implemented and ready for customization!