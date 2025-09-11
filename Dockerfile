# Use a specific, stable LTS version of Node.js for consistent builds.
# The `slim` variant keeps the image size minimal.
FROM node:18.17.0-slim

# Set the working directory inside the container.
WORKDIR /usr/src/app

# Copy the core application files and dependencies.
COPY package*.json ./

# Install application dependencies.
RUN npm install --production

# This is the corrected line. It copies everything from your local
# root directory into the container's app directory.
COPY . .

# Expose the port your application listens on.
EXPOSE 8080

# Define the command to start your application.
CMD ["node", "server.js"]