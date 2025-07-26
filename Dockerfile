# Multi-stage build for Flutter web
FROM ghcr.io/cirruslabs/flutter:3.16.0 AS builder

# Set working directory
WORKDIR /app

# Copy pubspec files and get dependencies
COPY pubspec.* ./
RUN flutter pub get

# Copy source code
COPY . .

# Build web application
RUN flutter build web --release --web-renderer html

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built web app to nginx html directory
COPY --from=builder /app/build/web /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]