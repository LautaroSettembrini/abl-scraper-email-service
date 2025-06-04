# Use the official Node.js image with the latest LTS version
FROM node:20-slim

# Install necessary dependencies for Puppeteer
RUN apt-get update \
    && apt-get install -y wget --no-install-recommends \
    && apt-get install -y \
        ca-certificates \
        fonts-liberation \
        libappindicator3-1 \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcups2 \
        libdbus-1-3 \
        libnss3 \
        libxcomposite1 \
        libxrandr2 \
        xdg-utils \
        lsb-release \
        libgbm-dev

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]