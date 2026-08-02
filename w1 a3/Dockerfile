# Dockerfile — build the Node.js app image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the rest of the source code
COPY . .

# Expose the port the app listens on
EXPOSE 3000

# Start the app
CMD ["node", "src/index.js"]
