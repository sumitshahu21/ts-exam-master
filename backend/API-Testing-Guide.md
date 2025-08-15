# API Testing Guide for Web App Test Portal

## 🚀 **Quick Start**

1. **Import Postman #### Create Single Choice Question
- **POST** `{{baseUrl}}/api/questions` (Admin token required)
```json
{
  "examId": 1,
  "questionType": "single-choice",
  "questionText": "What is the capital of France?",
  "marks": 5,
  "orderIndex": 1,
  "explanation": "Paris is the capital and largest city of France.",**: Import `postman-collection.json` into Postman
2. **Set Base URL**: The collection uses `{{baseUrl}}` variable. Set it to `http://localhost:5000`
3. **Test in Order**: Follow the sequence below for proper testing

## 📝 **Testing Sequence**

### **Step 1: Health Check**
- **GET** `{{baseUrl}}/api/health`
- **Expected**: Status 200 with server info

### **Step 2: Database Test**
- **GET** `{{baseUrl}}/api/test-db`
- **Expected**: Status 200 with user count

### **Step 3: Authentication**
First create users (admin and student):

#### Register Admin
- **POST** `{{baseUrl}}/api/auth/register`
```json
{
  "email": "admin@test.com",
  "password": "admin123",
  "firstName": "Test",
  "lastName": "Admin",
  "role": "admin"
}
```

#### Register Student
- **POST** `{{baseUrl}}/api/auth/register`
```json
{
  "email": "student@test.com",
  "password": "password123",
  "firstName": "Test",
  "lastName": "Student",
  "role": "student"
}
```

#### Login Admin (Save Token)
- **POST** `{{baseUrl}}/api/auth/login`
```json
{
  "email": "admin@test.com",
  "password": "admin123"
}
```
**Important**: Copy the token from response and set `adminToken` variable

#### Login Student (Save Token)
- **POST** `{{baseUrl}}/api/auth/login`
```json
{
  "email": "student@test.com",
  "password": "password123"
}
```
**Important**: Copy the token from response and set `authToken` variable

### **Step 4: Create Test Exam**
- **POST** `{{baseUrl}}/api/exams` (Admin token required)
```json
{
  "title": "Test Exam for Questions",
  "subject": "Computer Science",
  "description": "An exam to test question functionality",
  "duration": 60,
  "totalQuestions": 5,
  "passingScore": 70,
  "scheduledStartTime": "2025-07-30T10:00:00.000Z",
  "scheduledEndTime": "2025-07-30T18:00:00.000Z",
  "isPublished": true
}
```
**Note**: Remember the `examId` from response (likely 1)

### **Step 5: Test Question APIs**

**⚠️ Important**: Use `examId: 1` (or the ID you received from Step 4) for all question creation requests.

**📋 Question Ordering**: 
- The `orderIndex` field determines the sequence in which questions appear in the exam
- If not provided, the system auto-assigns the next available order number
- Questions are retrieved in ascending order of `orderIndex`
- You can manually set specific order numbers (1, 2, 3, etc.) for precise control

#### Create Single Choice Question
- **POST** `{{baseUrl}}/api/questions` (Admin token required)
```json
{
  "examId": 1,
  "questionType": "single-choice",
  "questionText": "What is the capital of France?",
  "points": 5,
  "order_index": 1,
  "explanation": "Paris is the capital and largest city of France.",
  "questionData": {
    "options": [
      {
        "id": "opt1",
        "text": "London",
        "isCorrect": false
      },
      {
        "id": "opt2",
        "text": "Paris",
        "isCorrect": true
      },
      {
        "id": "opt3",
        "text": "Berlin",
        "isCorrect": false
      },
      {
        "id": "opt4",
        "text": "Madrid",
        "isCorrect": false
      }
    ],
    "correctAnswer": "opt2",
    "randomizeOptions": false
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "questionId": 1,
    "orderIndex": 1
  }
}
```

#### Create Multiple Choice Question
- **POST** `{{baseUrl}}/api/questions` (Admin token required)
```json
{
  "examId": 1,
  "questionType": "multiple-choice",
  "questionText": "Which are programming languages? (Select all)",
  "marks": 10,
  "orderIndex": 2,
  "explanation": "JavaScript, Python, and Java are all programming languages, while HTML is a markup language.",
  "questionData": {
    "options": [
      {
        "id": "opt1",
        "text": "JavaScript",
        "isCorrect": true
      },
      {
        "id": "opt2",
        "text": "HTML",
        "isCorrect": false
      },
      {
        "id": "opt3",
        "text": "Python",
        "isCorrect": true
      },
      {
        "id": "opt4",
        "text": "Java",
        "isCorrect": true
      }
    ],
    "correctAnswers": ["opt1", "opt3", "opt4"],
    "minSelections": 1,
    "maxSelections": 4,
    "partialCredit": true
  }
}
```

#### Create Drag-Drop Question
- **POST** `{{baseUrl}}/api/questions` (Admin token required)
```json
{
  "examId": 1,
  "questionType": "drag-drop",
  "questionText": "Match programming concepts with definitions:",
  "marks": 15,
  "orderIndex": 3,
  "explanation": "Understanding variables and functions is fundamental to programming.",
  "questionData": {
    "subType": "matching",
    "dragItems": [
      {
        "id": "item1",
        "content": "Variable",
        "type": "text"
      },
      {
        "id": "item2",
        "content": "Function",
        "type": "text"
      }
    ],
    "dropTargets": [
      {
        "id": "target1",
        "label": "A container for storing data",
        "correctItemId": "item1",
        "acceptsMultiple": false
      },
      {
        "id": "target2",
        "label": "A reusable block of code",
        "correctItemId": "item2",
        "acceptsMultiple": false
      }
    ],
    "correctMappings": {
      "item1": "target1",
      "item2": "target2"
    },
    "allowPartialCredit": true
  }
}
```

#### Create Case Study Question
- **POST** `{{baseUrl}}/api/questions` (Admin token required)
```json
{
  "examId": 1,
  "questionType": "case-study",
  "questionText": "Database Design Case Study",
  "marks": 20,
  "orderIndex": 4,
  "explanation": "This case study tests understanding of database normalization and design principles.",
  "questionData": {
    "caseText": "You are designing a database for a library system. The system needs to track books, authors, borrowers, and loan transactions.",
    "subQuestions": [
      {
        "id": "sub1",
        "questionText": "What would be the primary key for the Books table?",
        "type": "single-choice",
        "marks": 5,
        "options": [
          {"id": "opt1", "text": "Book Title", "isCorrect": false},
          {"id": "opt2", "text": "ISBN", "isCorrect": true},
          {"id": "opt3", "text": "Author Name", "isCorrect": false}
        ]
      },
      {
        "id": "sub2",
        "questionText": "Which normal form prevents redundant author information?",
        "type": "single-choice",
        "marks": 5,
        "options": [
          {"id": "opt1", "text": "1NF", "isCorrect": false},
          {"id": "opt2", "text": "2NF", "isCorrect": false},
          {"id": "opt3", "text": "3NF", "isCorrect": true}
        ]
      }
    ]
  }
}
```

#### Create Short Answer Question
- **POST** `{{baseUrl}}/api/questions` (Admin token required)
```json
{
  "examId": 1,
  "questionType": "short-answer",
  "questionText": "Explain the difference between a primary key and a foreign key in database design.",
  "marks": 10,
  "orderIndex": 5,
  "explanation": "Primary key uniquely identifies records in a table, while foreign key establishes relationships between tables.",
  "questionData": {
    "maxWords": 100,
    "minWords": 20,
    "keyWords": ["primary key", "foreign key", "unique", "relationship", "table"],
    "sampleAnswer": "A primary key is a unique identifier for each record in a table, ensuring no duplicates. A foreign key is a field that links to the primary key of another table, establishing relationships between tables.",
    "gradingCriteria": [
      "Mentions uniqueness of primary key",
      "Explains relationship aspect of foreign key", 
      "Clear and concise explanation"
    ]
  }
}
```
```

### **Step 6: Read Operations**

#### Get All Questions for Exam
- **GET** `{{baseUrl}}/api/questions/exam/1` (Auth token required)

#### Get Questions by Type
- **GET** `{{baseUrl}}/api/questions/exam/1/type/single-choice`

#### Get Single Question
- **GET** `{{baseUrl}}/api/questions/1`

#### Get All Exams
- **GET** `{{baseUrl}}/api/exams` (Admin token required)

#### Get Published Exams
- **GET** `{{baseUrl}}/api/exams/published` (Student token required)

#### Get Specific Exam
- **GET** `{{baseUrl}}/api/exams/1` (Admin token required)

### **Step 7: Update/Delete Operations**

#### Update Question
- **PUT** `{{baseUrl}}/api/questions/1` (Admin token required)
```json
{
  "questionText": "What is the capital city of France?",
  "marks": 6,
  "explanation": "Paris is the capital and most populous city of France."
}
```

#### Delete Question
- **DELETE** `{{baseUrl}}/api/questions/3` (Admin token required)

#### Delete Exam (and all questions)
- **DELETE** `{{baseUrl}}/api/exams/1` (Admin token required)
**Warning**: This permanently deletes the exam and ALL associated questions

**Expected Response:**
```json
{
  "success": true,
  "message": "Exam and all associated questions deleted successfully",
  "deletedQuestions": 5,
  "deletedExam": 1
}
```

### **Step 8: Test Attempts & Answer Submission**

#### Start Test Attempt
- **POST** `{{baseUrl}}/api/test-attempts/start` (Student token required)
```json
{
  "examId": 1
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test attempt started successfully",
  "data": {
    "attemptId": 1,
    "examId": 1,
    "startTime": "2025-07-30T10:00:00.000Z",
    "duration": 60,
    "examTitle": "Test Exam for Questions"
  }
}
```

#### Submit Answer for Question
- **POST** `{{baseUrl}}/api/answers/submit` (Student token required)
```json
{
  "attemptId": 1,
  "questionId": 1,
  "studentAnswer": {
    "selectedOption": "opt2"
  }
}
```

**For Multiple Choice Question:**
```json
{
  "attemptId": 1,
  "questionId": 2,
  "studentAnswer": {
    "selectedOptions": ["opt1", "opt3", "opt4"]
  }
}
```

**For Drag-Drop Question:**
```json
{
  "attemptId": 1,
  "questionId": 3,
  "studentAnswer": {
    "mappings": {
      "item1": "target1",
      "item2": "target2"
    }
  }
}
```

#### Submit Test for Final Grading
- **POST** `{{baseUrl}}/api/test-attempts/1/submit` (Student token required)

**Expected Response:**
```json
{
  "success": true,
  "message": "Test submitted successfully",
  "data": {
    "attemptId": 1,
    "totalQuestions": 5,
    "questionsAnswered": 5,
    "correctAnswers": 4,
    "totalScore": 35,
    "totalMarks": 40,
    "percentageScore": 87.5,
    "grade": "PASS",
    "timeTaken": 45,
    "passed": true
  }
}
```

### **Step 9: Results & Analytics**

#### Get Student's Test Attempts
- **GET** `{{baseUrl}}/api/test-attempts/student` (Student token required)

#### Get Specific Test Attempt
- **GET** `{{baseUrl}}/api/test-attempts/1` (Student/Admin token required)

#### Get Answers for Test Attempt
- **GET** `{{baseUrl}}/api/answers/attempt/1` (Student/Admin token required)

#### Get Results for Test Attempt
- **GET** `{{baseUrl}}/api/results/attempt/1` (Student/Admin token required)

#### Get All Results for Exam (Admin Only)
- **GET** `{{baseUrl}}/api/results/exam/1` (Admin token required)

## 🎯 **Expected Results**

### ✅ **Success Indicators**
- All POST requests return status 201 with success message
- All GET requests return status 200 with data
- All PUT requests return status 200 with success message
- All DELETE requests return status 200 with success message
- Question data is properly stored and retrieved with correct JSON structure
- Authentication works with proper tokens
- Admin routes reject student tokens (403 Forbidden)

### ❌ **Common Issues**
- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Student trying to access admin routes
- **400 Bad Request**: Missing required fields or invalid JSON
- **404 Not Found**: Question/Exam doesn't exist
- **500 Internal Server Error**: Database connection or query issues

## 🔧 **Debugging Tips**

1. **Check Server Logs**: Monitor console output for detailed error messages
2. **Verify Tokens**: Ensure tokens are properly set in Postman variables
3. **Check Database**: Use `/api/test-db` endpoint to verify connection
4. **Validate JSON**: Ensure request bodies have valid JSON format
5. **Check IDs**: Make sure you're using correct examId and questionId values

## 📊 **Database Schema Verification**

After creating questions, you can verify the database structure:
- Questions stored in `questions` table
- JSON data properly stored in `question_data` field
- Foreign key relationships maintained
- Soft deletes working (is_active = 0)

## 🚀 **Next Steps**

Once basic CRUD operations are working:
1. Test bulk question creation
2. Test question reordering
3. Implement answer submission APIs
4. Test different question types thoroughly
5. Validate JSON schema for each question type
