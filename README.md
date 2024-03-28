# Book Catalog Application Setup Guide

This application allows users to view, add, edit, and delete books from a catalog. It's built with Node.js, Express, PostgreSQL, and EJS.

## Quick Start

Follow these steps to get the application running:

### Install Required Tools

Ensure you have Git, Node.js, and PostgreSQL installed. Use your package manager (like apt for Ubuntu, brew for macOS) to install these if you haven't already.

### Clone and Set Up the Application

1. Clone the repository:
   ```bash
   git clone https://github.com/GiorgiaCorsetti/book-catalogue.git
   
2. Move to the application directory:
   cd book-catalogue

3. Install dependencies:
   npm install
   
### Database Setup
Create a PostgreSQL database named books_catalog. Adjust .env file in the project root with your database settings.

### Run the Application
1. Start the server:
npm start

Or for development:
nodemon index.js

### Access the application at http://localhost:3000.
Enjoy exploring and managing your book catalog!
