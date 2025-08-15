# Copilot Instructions for Web App Test Portal

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a comprehensive Web App Test Portal similar to Pearson's testing platform with two main modules:

### Student Module Features:
- Authentication (login/register with email/password)
- Dashboard with upcoming tests and previous attempts
- Scheduled tests with countdown timers
- Test interface supporting multiple question types
- Results and performance tracking

### Admin Module Features:
- Secure admin authentication with role management
- Exam creation with multiple question types
- Exam management (edit, delete, publish, clone)
- Student results and analytics
- CSV/PDF report generation

### Question Types Supported:
- Single Choice (Radio buttons)
- Multiple Choice (Checkboxes)
- Drag & Drop (matching, ordering, labeling)
- Case Studies with multiple sub-questions
- Short Answer/Text (optional)
- Code-based questions (optional)

## Technical Stack:
- Frontend: React 18 with TypeScript
- Build Tool: Vite
- Styling: Tailwind CSS or Material-UI
- State Management: React Context/Redux Toolkit
- Backend: Node.js with Express
- Database: MongoDB with Mongoose
- Authentication: JWT tokens
- File Upload: Multer for profile photos
- Email: Nodemailer for password reset

## Code Style Guidelines:
- Use TypeScript for type safety
- Follow React best practices with hooks
- Implement proper error handling
- Use proper validation for forms
- Follow RESTful API conventions
- Implement proper authentication middleware
- Use environment variables for configuration
- Follow component-based architecture
- Implement responsive design
- Add proper loading states and error messages

## Security Considerations:
- Implement proper JWT token management
- Hash passwords using bcrypt
- Validate all user inputs
- Implement rate limiting
- Secure file upload functionality
- Protect admin routes with proper authorization
- Implement CORS properly
- Use HTTPS in production
