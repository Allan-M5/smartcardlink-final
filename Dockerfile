# Use a specific, stable LTS version of Node.js for consistent builds.
# The `slim` variant keeps the image size minimal.
FROM node:18.17.0-slim

# Set the working directory inside the container.
WORKDIR /usr/src/app

# Copy the core application files and dependencies.
COPY package*.json ./
COPY server.js ./
COPY public/ ./public/

# Install application dependencies.
RUN npm install --production

# Expose the port your application listens on.
EXPOSE 8080

# Define the command to start your application.
CMD ["node", "server.js"]