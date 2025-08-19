# Web App Test Portal

A comprehensive testing platform similar to Pearson's online exam system, built with React, TypeScript, and modern web technologies.

## 🌟 Features

### 👨‍🎓 Student Module
- **Authentication**: Secure login/register with email/password
- **Dashboard**: View upcoming tests, previous attempts, and performance statistics
- **Test Interface**: 
  - Multiple question types (Single choice, Multiple choice, Drag & Drop, Case studies)
  - Real-time timer with auto-submit
  - Question navigation with marking for review
  - Progress tracking and answer management
- **Results**: View detailed test results and performance analytics

### 👩‍🏫 Admin Module
- **Secure Authentication**: Role-based access control
- **Exam Creation**: 
  - Multiple question types support
  - Drag & drop question builder
  - Case study questions with sub-questions
  - Customizable scoring and time limits
- **Exam Management**: Edit, delete, publish/unpublish, and clone exams
- **Student Results**: 
  - Comprehensive analytics and reporting
  - Export to CSV/PDF
  - Individual student performance tracking
  - Grade distribution analysis

### 🔧 Question Types Supported
- ✅ Single Choice (Radio buttons)
- ✅ Multiple Choice (Checkboxes)  
- ✅ Drag & Drop (Matching, ordering, labeling)
- ✅ Case Studies with multiple sub-questions
- ✅ Short Answer/Text (planned)
- ✅ Code-based questions (planned)

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Redux Toolkit** for state management
- **React Router** for navigation
- **React Hook Form** with Zod validation
- **@dnd-kit** for drag and drop functionality
- **Lucide React** for icons
- **date-fns** for date manipulation

### Backend (Planned)
- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Multer** for file uploads
- **Nodemailer** for email functionality

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **npm** or **yarn**
- **SQL Server Management Studio (SSMS)** (for database setup)

## 🔹 Setup Instructions

### 1. Database Setup
1. Open **SSMS**.  
2. Execute the SQL script provided in:  
   ```bash
   execute-this-in-ssms.sql

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mynewproj
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend Setup
```bash
   cd backend
   ```
```bash
   npm install
   ```
```bash
   node working-server.js
   ```
```bash
    backend will be running at (http://localhost:5000)
   ```
  

