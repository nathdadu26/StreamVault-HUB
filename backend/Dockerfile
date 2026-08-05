# Use Node.js LTS image
FROM node:20-slim

# Install FFmpeg and other dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port (Koyeb usually uses 8080 or the PORT env var)
# The application binds to process.env.PORT || 3000
EXPOSE 3000

# Start the application
# For production, we'd use a compiled version, but here we'll use tsx for simplicity 
# or just node if we were to compile.
# Koyeb will use npm start
CMD ["npm", "start"]
