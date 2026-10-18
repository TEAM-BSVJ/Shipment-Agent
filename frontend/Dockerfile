# Stage 1: Build React/Vite assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source files
COPY . ./

# Environment arguments for Vite (empty string uses relative reverse proxy)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle into /app/dist
RUN npm run build

# Stage 2: Production Nginx web server
FROM nginx:alpine

# Remove default nginx html files
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled frontend assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
