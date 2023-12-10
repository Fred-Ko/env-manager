# Use an official Node.js runtime as the base image for building
FROM node:20 AS builder

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the app
RUN npm run build

# Use a lightweight alpine image for the production build
FROM node:20-alpine

# Set the working directory in the container to /app
WORKDIR /app

# Copy the build output from the builder stage to the production image
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Make port 3000 available to the world outside this container
EXPOSE 3000

# List the contents of the /app/dist directory
RUN ls /app/dist

# Define the command to run the app
CMD [ "node", "./dist/main.js" ]