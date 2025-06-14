# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app/backend

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Define environment variables (can be overridden by docker-compose)
# Note: DATABASE_URL, JWT_SECRET, GEMINI_API_BASE_URL, GEMINI_API_KEY, GEMINI_MODEL
# will need to be provided at runtime, e.g., via docker-compose.yml or .env file for docker-compose
ENV PORT=3000

# Run the app when the container launches
CMD ["node", "server.js"]
