FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy all source files
COPY . .

# Install dependencies
RUN npm install

# Build the project
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Set executable permissions
RUN chmod +x dist/index.js

# Run as non-root user
USER node

# Start the server
CMD ["node", "dist/index.js"]

# Label the image
LABEL org.opencontainers.image.source="https://github.com/YannickTM/docu-mcp.git"
LABEL org.opencontainers.image.description="MCP server for code documentation, diagram generation, and semantic code search"
LABEL org.opencontainers.image.licenses="MIT"