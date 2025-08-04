# TPE Backend API

Backend API for The Power100 Experience platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Initialize database**:
```bash
npm run migrate
```

4. **Start development server**:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

### Authentication
- POST `/api/auth/login` - Admin login
- POST `/api/auth/logout` - Logout
- GET `/api/auth/me` - Get current user

### Contractors
- POST `/api/contractors/verify-start` - Start verification
- POST `/api/contractors/verify-code` - Verify code
- PUT `/api/contractors/:id/profile` - Update profile
- GET `/api/contractors/:id/matches` - Get partner matches
- POST `/api/contractors/:id/complete` - Complete flow

### Partners (Admin)
- GET `/api/partners` - List all partners
- POST `/api/partners` - Create partner
- PUT `/api/partners/:id` - Update partner
- DELETE `/api/partners/:id` - Delete partner

### Bookings (Admin)
- GET `/api/bookings` - List all bookings
- PUT `/api/bookings/:id` - Update booking
- GET `/api/bookings/stats/overview` - Booking statistics

### Admin Dashboard
- GET `/api/admin/dashboard` - Dashboard statistics
- GET `/api/admin/export/contractors` - Export contractors
- GET `/api/admin/export/partners` - Export partners
- GET `/api/admin/export/bookings` - Export bookings

## 🔒 Security

- JWT authentication
- Rate limiting
- Input validation
- SQL injection protection
- CORS configuration

## 🧪 Testing

```bash
npm test
```

## 🚀 Production Deployment

1. Set production environment variables
2. Run database migrations
3. Use PM2 or similar for process management
4. Configure reverse proxy (nginx)
5. Enable SSL/TLS

## 📝 Environment Variables

See `.env.example` for all required variables.

Key variables:
- `DB_*` - PostgreSQL connection
- `JWT_SECRET` - JWT signing key
- `TWILIO_*` - SMS service (optional)
- `SENDGRID_*` - Email service (optional)