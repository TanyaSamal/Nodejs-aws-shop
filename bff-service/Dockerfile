# Step 1: Build Stage
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy only package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies for production and development (needed to compile TypeScript) with enabled caching
RUN --mount=type=cache,target=/root/.npm npm install

# Copy the rest of the code
COPY . .

# Build app
RUN npm run build


# Step 2: Run Stage
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy only the built files and essential dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/package-lock.json ./

# Enable caching of the node_modules directory or npm cache files and install only production dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --only=production

# Expose the application port
EXPOSE 5000

# Set the default command to run the application
CMD ["node", "dist/main"]
