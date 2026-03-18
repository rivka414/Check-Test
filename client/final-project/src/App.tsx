import { useState } from 'react';
import Setup, { type SetupResources } from './components/Setup';
import GradingDashboard from './components/GradingDashboard';
import './App.css';

function App() {
  // ניהול השלב שבו המורה נמצאת (הגדרות או בדיקה)
  const [step, setStep] = useState<'setup' | 'grading'>('setup');
  
  // שמירת חומרי המקור (סילבוס ושאלון) כדי שנוכל להשתמש בהם בהמשך
  const [resources, setResources] = useState<SetupResources | null>(null);

  // פונקציה שנקראת מה-Setup כשלוחצים על "נעל חומרי מקור"
  const handleLock = (data: SetupResources) => {
    setResources(data); // שמירת הקבצים ב-State של האפליקציה
    setStep('grading'); // מעבר למסך הבדיקה
    console.log("חומרי מקור ננעלו:", data);
  };

  return (
    <div className="app-container">
      {step === 'setup' ? (
        // אם אנחנו בשלב ה-Setup, נציג את מסך העלאת החומרים
        <Setup onLockResources={handleLock} />
      ) : (
        // אם עברנו את ה-Setup, נציג את ה-Dashboard הראשי
        // אפשר גם להעביר את ה-resources כ-props אם ה-Dashboard צריך אותם
        <GradingDashboard />
      )}
    </div>
  );
}

export default App;
