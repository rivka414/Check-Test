import React, { useState, type ChangeEvent } from 'react';
import '../styles/Steup.css'; 

export interface SetupResources {
  syllabus: File;
  examTemplate: File;
}

interface SetupProps {
  onLockResources: (resources: SetupResources) => void;
}

const Setup: React.FC<SetupProps> = ({ onLockResources }) => {
  const [syllabus, setSyllabus] = useState<File | null>(null);
  const [examTemplate, setExamTemplate] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false); // מצב טעינה

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>, 
    setFile: (file: File | null) => void
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleLock = async () => {
    if (syllabus && examTemplate) {
      setIsLoading(true);
      
      try {
        // הכנת הנתונים למשלוח (FormData תומך בשליחת קבצים)
        const formData = new FormData();
        formData.append('file', syllabus);

        // שליחת הסילבוס לשרת הפייתון (הנתיב שיצרנו ב-FastAPI)
        const response = await fetch('http://localhost:8000/setup-resources', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('העלאת הסילבוס נכשלה');
        }

        const result = await response.json();
        console.log('Server response:', result);

        // אם ההעלאה הצליחה, נמשיך הלאה באפליקציה
        onLockResources({
          syllabus,
          examTemplate
        });
        
        alert("חומרי המקור הועלו ואונדקסו בהצלחה!");
      } catch (error) {
        console.error('Error uploading files:', error);
        alert("שגיאה בחיבור לשרת. וודאי ששרת הפייתון רץ.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="setup-container">


        {/* --- הוספת הלוגו המעוצב --- */}
      <div className="main-logo-wrapper" dir="ltr">
        <div className="icon-wrapper">
          <div className="logo-icon">
            <span className="bar red"></span>
            <span className="bar orange"></span>
            <span className="bar green-bar"></span>
          </div>
          <span className="arrow-up"></span>
        </div>
        <div className="logo-text">
          <span className="check-word">
            <span className="char">C</span><span className="char">h</span><span className="char">e</span><span className="char">c</span><span className="char">k</span>
          </span>
          <span className="test-word">
            <span className="char">T</span><span className="char">e</span><span className="char">s</span><span className="char">t</span>
          </span>
        </div>
      </div>
      {/* --- סוף הלוגו --- */}


      <h2 className="setup-title">שלב 1: הגדרת חומרי מקור</h2>
      
      <div className="upload-section">
        <label className="upload-label">1. העלאת חומר לימודי / סילבוס</label>
        <p className="helper-text">ה-AI יתבסס על תוכן זה כדי לנתח את תשובות התלמידות.</p>
        <input 
          type="file" 
          accept=".pdf,.jpg,.png,.docx"
          className="file-input"
          onChange={(e) => handleFileChange(e, setSyllabus)}
        />
        {syllabus && <div className="file-name">✓ קובץ נקלט: {syllabus.name}</div>}
      </div>

      <div className="upload-section">
        <label className="upload-label">2. העלאת שאלון המבחן</label>
        <p className="helper-text">העלי את השאלון כדי שהמערכת תזהה את מבנה השאלות.</p>
        <input 
          type="file" 
          accept=".pdf,.jpg,.png,.docx"
          className="file-input"
          onChange={(e) => handleFileChange(e, setExamTemplate)}
        />
        {examTemplate && <div className="file-name">✓ קובץ נקלט: {examTemplate.name}</div>}
      </div>

      <button 
        className="lock-button"
        onClick={handleLock}
        disabled={!syllabus || !examTemplate || isLoading}
      >
        {isLoading ? "מעבד ומאנדקס ב-Pinecone..." : "נעל חומרי מקור ועבור לבדיקה"}
      </button>
    </div>
  );
};

export default Setup;