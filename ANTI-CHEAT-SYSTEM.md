# Anti-Cheat System Implementation

## 🛡️ Overview

The anti-cheat system provides comprehensive security monitoring for online exams, ensuring academic integrity through multiple layers of protection.

## 🔧 Features Implemented

### 1. **Full Screen Enforcement**
- Automatically enters full screen mode when exam starts
- Detects and prevents full screen exits
- Attempts to restore full screen automatically
- Shows warning indicators when not in full screen

### 2. **Tab/Window Monitoring**
- Detects tab switching (`visibilitychange` events)
- Monitors window focus/blur events
- Tracks time spent away from exam window
- Logs all tab switch activities

### 3. **Developer Tools Detection**
- Monitors window size changes to detect DevTools
- Detects common developer console access patterns
- Blocks F12 and other developer shortcuts

### 4. **Keyboard Security**
- Blocks dangerous keyboard shortcuts:
  - `F12` (DevTools)
  - `F5` (Refresh)
  - `Ctrl+R` (Refresh)
  - `Ctrl+W` (Close tab)
  - `Ctrl+T` (New tab)
  - `Ctrl+N` (New window)
  - `Ctrl+Shift+J/I/C` (DevTools)
  - `Alt+Tab` (Task switching)

### 5. **Copy/Paste Protection**
- Blocks copy operations globally during exam
- Allows paste only in text input fields
- Prevents right-click context menu

### 6. **Violation Tracking & Actions**
- Configurable violation limits (default: 5 max, 3 warning)
- Progressive warnings to students
- Automatic actions on max violations:
  - **Warn**: Show critical warning
  - **Lock**: Lock exam interface
  - **Submit**: Auto-submit exam

### 7. **Real-time Monitoring**
- Live violation counter display
- Security status indicator
- Visual warnings and alerts
- Admin violation logging

## 📁 Files Added/Modified

### New Files:
1. **`src/hooks/useAntiCheat.ts`** - Core anti-cheat logic hook
2. **`src/components/AntiCheatIndicator.tsx`** - UI components for status and warnings

### Modified Files:
1. **`src/pages/student/InteractiveExamInterface.tsx`** - Integrated anti-cheat system
2. **`backend/working-server.js`** - Added security violation logging endpoint

## 🚀 How It Works

### 1. **Exam Start Flow**
```
Student clicks "Start Exam" 
→ Security Guidelines Modal appears
→ Student acknowledges guidelines  
→ Full screen mode activated
→ Anti-cheat monitoring begins
→ Exam interface loads
```

### 2. **Violation Detection**
```
Security Event Detected
→ Violation logged locally & to backend
→ Warning counter incremented
→ Visual indicator updated
→ Action taken based on violation count
```

### 3. **Progressive Actions**
- **Violations 1-2**: Silent logging
- **Violations 3-4**: Warning notifications
- **Violation 5+**: Automatic exam submission

## ⚙️ Configuration

The anti-cheat system is highly configurable:

```typescript
const antiCheatConfig = {
  enableFullScreen: true,       // Force full screen mode
  maxViolations: 5,            // Maximum violations before action
  warningThreshold: 3,         // Show warnings after this many violations
  actionOnMaxViolations: 'submit', // 'warn' | 'lock' | 'submit'
  monitorTabSwitch: true,      // Monitor tab/window switching
  monitorDevTools: true,       // Detect developer tools
  monitorCopyPaste: true,      // Block copy/paste operations
  logEvents: true              // Log all security events
};
```

## 🔍 Security Events Monitored

| Event Type | Description | Trigger |
|------------|-------------|---------|
| `fullscreen_exit` | User exited full screen | Document fullscreen change |
| `tab_switch` | User switched tabs/windows | Visibility/focus change |
| `window_blur` | Window lost focus | Window blur event |
| `devtools` | Developer tools detected | Window size analysis |
| `keyboard_shortcut` | Blocked shortcut used | Keydown events |
| `copy` | Copy operation attempted | Copy event |
| `paste` | Paste operation blocked | Paste event (outside inputs) |
| `context_menu` | Right-click attempted | Context menu event |

## 🎯 User Experience

### For Students:
1. **Pre-Exam**: Clear security guidelines with acknowledgment
2. **During Exam**: Minimal intrusive monitoring with helpful indicators
3. **Violations**: Progressive warnings with clear violation counts
4. **Emergency**: Option to return to full screen if accidentally exited

### For Administrators:
1. **Real-time Monitoring**: Live violation tracking per student
2. **Violation Logs**: Detailed logs of all security events
3. **Configurable Policies**: Adjustable violation limits and actions
4. **Analytics**: Security reports and patterns

## 🛡️ Security Guidelines Modal

Before starting any exam, students see a comprehensive modal explaining:
- Security requirements and restrictions
- Violation policy and consequences
- Permitted and prohibited actions
- Acknowledgment requirement

## 🔧 Technical Implementation

### Anti-Cheat Hook (`useAntiCheat`)
- Event listeners for security monitoring
- Violation counting and threshold management
- Fullscreen API integration
- Local storage for violation persistence

### Security Indicator Component
- Real-time status display
- Violation warnings
- Fullscreen controls
- Emergency actions

### Backend Integration
- Security violation logging API
- Violation analytics
- Admin reporting tools

## 🚨 Violation Actions

### Warning (3+ violations):
```
"Security Warning 1: Suspicious activity detected. 
2 violations remaining before action."
```

### Critical (5+ violations):
```
"Maximum violations reached. Exam will be auto-submitted."
→ Automatic exam submission triggered
```

### Exam Locked:
```
"Exam locked due to security violations. 
Please contact administrator."
→ Interface disabled, requires admin intervention
```

## 📊 Database Schema

New table for violation logging:
```sql
CREATE TABLE security_violations (
  id INT IDENTITY(1,1) PRIMARY KEY,
  attempt_id INT NOT NULL,
  user_id INT NOT NULL,
  exam_id INT NOT NULL,
  violation_type VARCHAR(50) NOT NULL,
  details NVARCHAR(MAX),
  violation_timestamp DATETIME2 NOT NULL,
  created_at DATETIME2 DEFAULT GETDATE()
);
```

## 🔄 Future Enhancements

1. **Biometric Detection**: Webcam-based identity verification
2. **AI Monitoring**: Machine learning for unusual behavior patterns
3. **Network Analysis**: VPN/proxy detection
4. **Advanced Shortcuts**: More comprehensive shortcut blocking
5. **Mobile Support**: Touch gesture monitoring for mobile devices
6. **Browser Fingerprinting**: Device consistency checks

## 🐛 Known Limitations

1. **Browser Compatibility**: Some features may not work in older browsers
2. **Accessibility**: Screen readers may be affected by fullscreen mode
3. **Mobile Devices**: Limited effectiveness on mobile platforms
4. **False Positives**: System notifications might trigger false violations

## 📝 Usage Examples

### Basic Integration:
```tsx
const antiCheat = useAntiCheat(
  { maxViolations: 3 },
  (violation) => console.log('Violation:', violation),
  () => submitExam()
);

// Start monitoring
await antiCheat.startAntiCheat();

// Stop monitoring
antiCheat.stopAntiCheat();
```

### Custom Configuration:
```tsx
const strictConfig = {
  enableFullScreen: true,
  maxViolations: 3,
  warningThreshold: 1,
  actionOnMaxViolations: 'lock',
  monitorTabSwitch: true,
  monitorDevTools: true,
  monitorCopyPaste: true,
  logEvents: true
};
```

This anti-cheat system provides a robust foundation for maintaining academic integrity in online exams while preserving a smooth user experience for legitimate test-takers.
