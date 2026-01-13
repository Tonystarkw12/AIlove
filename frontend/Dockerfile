# Stage 1: Build the frontend
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /usr/src/app/frontend

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application for H5 (web)
# Assuming your build script produces output in 'dist/build/h5' for web deployment
# Adjust if your uni-app build command or output directory for H5 is different.
# Common uni-app build command for H5: npm run build:h5
RUN npm run build:h5

# Stage 2: Serve the built application with Nginx
FROM nginx:stable-alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy static assets from builder stage
# Adjust the source path '/usr/src/app/frontend/dist/build/h5' if your build output is different
COPY --from=builder /usr/src/app/frontend/dist/build/h5 /usr/share/nginx/html

# Expose port 80 for Nginx
EXPOSE 80

# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]
