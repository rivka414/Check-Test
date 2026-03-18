import React, { useState, type ChangeEvent } from 'react';
import GradingTable, { type ExamQuestion } from './GradingTable';
import '../styles/GradingDashboard.css';

const GradingDashboard: React.FC = () => {
    const [currentExamFile, setCurrentExamFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [gradingData, setGradingData] = useState<ExamQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const totalScore = gradingData.reduce((sum, q) => sum + q.finalScore, 0);

    const handleExamUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCurrentExamFile(file);
            setPreviewUrl(URL.createObjectURL(file));

            // התחלת תהליך אמיתי מול השרת
            setIsLoading(true);
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('http://localhost:8000/analyze-exam', {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();

                if (result.status === "success") {
                    setGradingData(result.data);
                }
            } catch (error) {
                console.error("Error communicating with server:", error);
                alert("שגיאה בחיבור לשרת ה-AI");
            } finally {
                setIsLoading(false);
            }
        }
    };
    const handleScoreChange = (id: number, newScore: number) => {
        setGradingData(prevData =>
            prevData.map(q => q.id === id ? { ...q, finalScore: newScore } : q)
        );
    };

    // const simulateAiAnalysis = () => {
    //     setIsLoading(true);
    //     setGradingData([]); 

    //     // ב-Production כאן יתבצע ה-Fetch לשרת
    //     setTimeout(() => {
    //         // כרגע זה ריק - ברגע שנחבר ל-API, המערך הזה יתמלא בשאלות שהתגלו בסריקה
    //         const realDetectedQuestions: ExamQuestion[] = []; 
    //         setGradingData(realDetectedQuestions);
    //         setIsLoading(false);
    //     }, 2000);
    // };

    return (
        <div className="dashboard-container">
            <header className="top-bar">
                {/* --- החלפת הכותרת בלוגו המעוצב --- */}
                <div className="main-logo-wrapper dashboard-logo" dir="ltr">
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

                {/* <-- --- כפתור העלאת קובץ סריקה --- --> */}
                <div className="upload-section">
                    <input type="file" id="exam-upload" hidden onChange={handleExamUpload} accept=".pdf,image/*" />
                    <label htmlFor="exam-upload" className="upload-btn">
                        {currentExamFile ? 'החלף קובץ סריקה' : 'העלה סריקת מבחן'}
                    </label>
                </div>
            </header>

            <main className="main-content">
                <section className="left-panel">
                    {previewUrl ? (
                        <div className="preview-wrapper">
                            {currentExamFile?.type === 'application/pdf' ? (
                                <embed src={previewUrl} type="application/pdf" width="100%" height="100%" />
                            ) : (
                                <img src={previewUrl} alt="מבחן סרוק" className="preview-image" />
                            )}
                        </div>
                    ) : (
                        <div className="no-file-message">
                            <p>טרם הועלה קובץ.</p>
                            <p>אנא העלי את סריקת המבחן של התלמידה כדי להתחיל.</p>
                        </div>
                    )}
                </section>

                <section className="right-panel">
                    {isLoading ? (
                        <div className="loader">
                            <div className="spinner"></div>
                            <p>מנתח את הדף הסרוק ומחלץ שאלות...</p>
                        </div>
                    ) : gradingData.length > 0 ? (
                        <div className="table-wrapper">
                            <h4 className="section-title">ניתוח המבחן</h4>
                            <GradingTable questions={gradingData} onScoreChange={handleScoreChange} />

                            <div className="output-summary-bar">
                                <div className="summary-details">
                                    <span>שאלות שזוהו: <strong>{gradingData.length}</strong></span>
                                    <span className="final-score-badge">ציון כולל: <strong>{totalScore}</strong></span>
                                </div>
                                <button className="generate-btn">אישור והפקת PDF</button>
                            </div>
                        </div>
                    ) : (
                        <div className="no-file-message">
                            {previewUrl ? "ה-AI לא זיהה שאלות בקובץ זה." : "העלי מבחן כדי להתחיל בבדיקה."}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default GradingDashboard;