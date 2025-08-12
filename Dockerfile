# Multi-stage build for The Power100 Experience

# Backend Stage
FROM node:18-alpine AS backend
WORKDIR /app/backend
COPY tpe-backend/package*.json ./
RUN npm install --only=production
COPY tpe-backend/ ./

# Frontend Stage  
FROM node:18-alpine AS frontend
WORKDIR /app/frontend
COPY tpe-front-end/package*.json ./
RUN npm install
COPY tpe-front-end/ ./
RUN npm run build

# Production Stage
FROM node:18-alpine AS production
WORKDIR /app

# Copy backend
COPY --from=backend /app/backend ./backend

# Copy frontend build
COPY --from=frontend /app/frontend/.next ./frontend/.next
COPY --from=frontend /app/frontend/public ./frontend/public
COPY --from=frontend /app/frontend/package*.json ./frontend/

# Install frontend production dependencies
WORKDIR /app/frontend
RUN npm install --only=production

# Set working directory back to root
WORKDIR /app

# Expose port
EXPOSE 5000

# Start backend server
CMD ["node", "backend/src/server.js"]