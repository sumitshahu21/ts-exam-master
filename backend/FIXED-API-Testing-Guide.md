# ✅ COMPLETED: Updated API Testing Guide - Simplified Questions Schema

## 🎯 **Schema Update Complete ✅**
- ✅ **Migration Completed Successfully**: Questions table updated with simplified JSON structure
- ✅ **Redundant Columns Removed**: question_text, case_study_content, code_template, metadata, explanation
- ✅ **All Data Preserved**: Existing question data migrated to JSON format in question_data column
- ✅ **Schema Verified**: All questions have valid JSON data structure

## 📊 **Final Questions Table Schema**

| Column Name    | Data Type      | Description |
|---------------|----------------|-------------|
| id            | INT (PK)       | Unique ID of the question |
| exam_id       | INT (FK)       | Foreign key referencing the exams table |
| question_type | VARCHAR(50)    | e.g. "single-choice", "multiple-choice", etc |
| question_data | NVARCHAR(MAX)  | **Complete question details in JSON format** |
| marks         | INT            | Backup field (points now in question_data.points) |
| order_index   | INT            | Question order in exam |
| is_active     | BIT            | Whether question is active |
| created_at    | DATETIME2      | Auto timestamp |
| updated_at    | DATETIME       | Auto timestamp |

## 🗑️ **Successfully Removed Columns**
- ~~question_text~~ → Now in `question_data.questionText`
- ~~explanation~~ → Now in `question_data.explanation` 
- ~~case_study_content~~ → Now in `question_data.caseStudyContext`
- ~~code_template~~ → Now in `question_data` if needed
- ~~metadata~~ → Integrated into `question_data`

## 🚀 **Migration Results**
- **✅ 1 question successfully migrated**
- **✅ JSON data structure validated**  
- **✅ All foreign key relationships preserved**
- **✅ Backup available in questions_backup table**

### **Step 2: Start Backend Server**
```bash
cd c:\Users\sumit\mynewproj\backend
node working-server.js
```

**✅ Migration Already Completed - Server Ready to Use!**

### **Step 3: Authentication (Required First)**

#### **A. Login as Admin**
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "admin@test.com",
    "firstName": "Test",
    "lastName": "Admin",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Important:** Copy the `token` value and use it in all subsequent requests as:
`Authorization: Bearer YOUR_TOKEN_HERE`

### **Step 4: Create Exam (Now Works!)**

```http
POST http://localhost:5000/api/exams
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE

{
  "title": "API Test Exam",
  "subject": "Demosub1",
  "description": "Testing question APIs",
  "duration": 60,
  "totalQuestions": 10,
  "passingScore": 70,
  "scheduledStartTime": "2025-07-30T10:00:00.000Z",
  "scheduledEndTime": "2025-07-30T18:00:00.000Z",
  "isPublished": true
}
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Exam created successfully",
  "examId": 1,
  "isPublished": true
}
```

### **Step 5: Create Questions (Updated JSON Format)**

#### **A. Single Choice Question**
```http
POST http://localhost:5000/api/questions
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE

{
  "examId": 1,
  "questionType": "single-choice",
  "questionData": {
    "questionText": "What is the capital of France?",
    "points": 5,
    "explanation": "Paris is the capital and largest city of France.",
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

#### **B. Multiple Choice Question**
```http
POST http://localhost:5000/api/questions
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE

{
  "examId": 1,
  "questionType": "multiple-choice",
  "questionData": {
    "questionText": "Which are programming languages? (Select all that apply)",
    "points": 10,
    "explanation": "JavaScript, Python, and Java are all programming languages.",
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

#### **C. Drag & Drop Question**
```http
POST http://localhost:5000/api/questions
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE

{
  "examId": 1,
  "questionType": "drag-drop",
  "questionData": {
    "questionText": "Match the programming concepts with their definitions:",
    "points": 15,
    "explanation": "Understanding basic programming concepts.",
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

#### **D. Case Study Question**
```http
POST http://localhost:5000/api/questions
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE

{
  "examId": 1,
  "questionType": "case-study",
  "questionData": {
    "questionText": "Case Study: Data Privacy Law",
    "caseStudyContext": "XYZ Corp collects customer data for marketing purposes. They store personal information including names, addresses, phone numbers, and browsing habits. Recently, they received a request from a customer to delete all their personal data from the company's systems.",
    "points": 20,
    "subQuestions": [
      {
        "questionType": "single-choice",
        "questionText": "Which law governs this data deletion request practice?",
        "options": [
          {"id": "opt1", "text": "GDPR", "isCorrect": true},
          {"id": "opt2", "text": "DMCA", "isCorrect": false},
          {"id": "opt3", "text": "HIPAA", "isCorrect": false},
          {"id": "opt4", "text": "SOX", "isCorrect": false}
        ],
        "correctAnswer": "opt1"
      },
      {
        "questionType": "multiple-choice",
        "questionText": "Which rights are provided by GDPR to data subjects?",
        "options": [
          {"id": "opt1", "text": "Right to be forgotten", "isCorrect": true},
          {"id": "opt2", "text": "Right to spam customers", "isCorrect": false},
          {"id": "opt3", "text": "Right to data portability", "isCorrect": true},
          {"id": "opt4", "text": "Right to sell data", "isCorrect": false}
        ],
        "correctAnswers": ["opt1", "opt3"]
      }
    ]
  }
}
```

#### **E. Short Answer Question**
```http
POST http://localhost:5000/api/questions
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE

{
  "examId": 1,
  "questionType": "short-answer",
  "questionData": {
    "questionText": "Explain the difference between HTTP and HTTPS in your own words.",
    "points": 8,
    "explanation": "HTTP is unencrypted while HTTPS uses SSL/TLS encryption for secure communication.",
    "maxLength": 500,
    "minLength": 50,
    "sampleAnswer": "HTTP transmits data in plain text while HTTPS encrypts the data using SSL/TLS protocols, making it more secure for sensitive information transfer."
  }
}
```

### **Step 6: Read Operations (Updated)**

#### **Get All Questions for Exam**
```http
GET http://localhost:5000/api/questions/exam/1
Authorization: Bearer YOUR_TOKEN_HERE
```

#### **Get Single Question**
```http
GET http://localhost:5000/api/questions/1
Authorization: Bearer YOUR_TOKEN_HERE
```

#### **Get Questions by Type**
```http
GET http://localhost:5000/api/questions/exam/1/type/single-choice
Authorization: Bearer YOUR_TOKEN_HERE
```

### **Step 7: Update Operations (Updated Schema)**

#### **Update Question**
```http
PUT http://localhost:5000/api/questions/1
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE

{
  "questionData": {
    "questionText": "What is the capital city of France? (Updated)",
    "points": 6,
    "explanation": "Paris is the capital and most populous city of France.",
    "options": [
      {"id": "opt1", "text": "London", "isCorrect": false},
      {"id": "opt2", "text": "Paris", "isCorrect": true},
      {"id": "opt3", "text": "Berlin", "isCorrect": false},
      {"id": "opt4", "text": "Madrid", "isCorrect": false}
    ],
    "correctAnswer": "opt2",
    "randomizeOptions": false
  }
}
```

### **Step 8: Delete Operations**

#### **Delete Question**
```http
DELETE http://localhost:5000/api/questions/1
Authorization: Bearer YOUR_TOKEN_HERE
```

## ✅ **Expected Success Indicators (Updated Schema)**

1. **Schema Migration Works**: Migration script completes without errors
2. **Authentication Works**: Login returns a valid JWT token
3. **Exam Creation Works**: No more "created_by NULL" errors
4. **Questions Create Successfully**: All question types store properly with JSON data
5. **JSON Data Stored**: Complex question data saved in `question_data` column
6. **CRUD Operations Work**: Create, Read, Update, Delete all functional with new schema

## ❌ **Troubleshooting (Updated)**

### **Common Issues:**
- **Migration Errors**: Backup table exists if rollback needed
- **JSON Format Errors**: Ensure `questionData` is properly formatted JSON object
- **401 Unauthorized**: Missing or invalid token - re-login and copy new token
- **403 Forbidden**: Student trying to access admin routes - use admin token
- **500 Database Error**: Run the migration script if schema issues persist

### **Quick Fixes:**
```bash
# If you get database schema errors, run migration:
cd backend
node migrate-questions-schema.js

# If authentication fails, restart server:
node working-server.js

# To rollback schema changes if needed:
# DROP TABLE questions; ALTER TABLE questions_backup RENAME TO questions;
```

## 🎯 **Test Results Validation**

### **Successful Question Creation Response (Updated):**
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

### **Successful Question Retrieval Response (Updated Schema):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "exam_id": 1,
      "question_type": "single-choice",
      "question_data": {
        "questionText": "What is the capital of France?",
        "points": 5,
        "explanation": "Paris is the capital and largest city of France.",
        "options": [
          {"id": "opt1", "text": "London", "isCorrect": false},
          {"id": "opt2", "text": "Paris", "isCorrect": true}
        ],
        "correctAnswer": "opt2",
        "randomizeOptions": false
      },
      "order_index": 1,
      "is_active": true,
      "created_at": "2025-08-01T...",
      "updated_at": "2025-08-01T..."
    }
  ]
}
```

## 🚀 **Ready for Testing! (Schema Updated)**

The backend is now fully functional with:
- ✅ Simplified questions table with JSON storage
- ✅ All question data in single `question_data` column
- ✅ Proper authentication and authorization
- ✅ Working question CRUD operations with new schema
- ✅ JSON storage for all question types and formats
- ✅ Migration script to update existing data
- ✅ Proper error handling and validation

## 📋 **JSON Examples for question_data Column**

### **Single Choice Format:**
```json
{
  "questionText": "What is the capital of France?",
  "points": 5,
  "explanation": "Paris is the capital and largest city.",
  "options": [
    {"id": "opt1", "text": "London", "isCorrect": false},
    {"id": "opt2", "text": "Paris", "isCorrect": true}
  ],
  "correctAnswer": "opt2",
  "randomizeOptions": false
}
```

### **Multiple Choice Format:**
```json
{
  "questionText": "Which are programming languages?",
  "points": 10,
  "explanation": "JS, Python, and Java are valid languages.",
  "options": [
    {"id": "opt1", "text": "JavaScript", "isCorrect": true},
    {"id": "opt2", "text": "HTML", "isCorrect": false},
    {"id": "opt3", "text": "Python", "isCorrect": true}
  ],
  "correctAnswers": ["opt1", "opt3"],
  "minSelections": 1,
  "maxSelections": 4,
  "partialCredit": true
}
```

### **Drag and Drop Format:**
```json
{
  "questionText": "Match the concepts with their definitions:",
  "points": 15,
  "explanation": "Basic programming concept matching.",
  "subType": "matching",
  "dragItems": [
    {"id": "item1", "content": "Variable", "type": "text"},
    {"id": "item2", "content": "Function", "type": "text"}
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
```

### **Case Study Format:**
```json
{
  "questionText": "Case Study: Data Privacy Law",
  "caseStudyContext": "XYZ Corp collects customer data...",
  "points": 20,
  "subQuestions": [
    {
      "questionType": "single-choice",
      "questionText": "Which law governs this practice?",
      "options": [
        {"id": "opt1", "text": "GDPR", "isCorrect": true},
        {"id": "opt2", "text": "DMCA", "isCorrect": false}
      ],
      "correctAnswer": "opt1"
    },
    {
      "questionType": "multiple-choice",
      "questionText": "Which rights are provided by GDPR?",
      "options": [
        {"id": "opt1", "text": "Right to be forgotten", "isCorrect": true},
        {"id": "opt2", "text": "Right to spam", "isCorrect": false}
      ],
      "correctAnswers": ["opt1"]
    }
  ]
}
```

### **Short Answer Format:**
```json
{
  "questionText": "Explain the difference between HTTP and HTTPS.",
  "points": 8,
  "explanation": "HTTP is unencrypted while HTTPS uses SSL/TLS encryption.",
  "maxLength": 500,
  "minLength": 50,
  "sampleAnswer": "HTTP transmits data in plain text while HTTPS encrypts data using SSL/TLS protocols."
}
```

You can now test all question, answer, and options APIs with the updated schema through Postman successfully! 🎉
