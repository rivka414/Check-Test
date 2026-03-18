import React from 'react';
import '../styles/GradingTable.css'; // ייבוא CSS רגיל

// הגדרת הטיפוס של שאלה בודדת
export interface ExamQuestion {
    id: number;
    questionNumber: string;
    studentAnswer: string;
    aiEvaluation: 'correct' | 'partial' | 'wrong';
    missingInfo: string;
    recommendedScore: string; // למשל "7/10"
    finalScore: number;       // הציון המספרי לעריכה
}

interface GradingTableProps {
    questions: ExamQuestion[];
    onScoreChange: (id: number, newScore: number) => void;
}

const GradingTable: React.FC<GradingTableProps> = ({ questions, onScoreChange }) => {

    // פונקציית עזר להמרת הערכת ה-AI לטקסט בעברית
    const getEvaluationLabel = (evaluation: string) => {
        switch (evaluation) {
            case 'correct': return 'נכון';
            case 'partial': return 'חלקית';
            case 'wrong': return 'שגוי';
            default: return evaluation;
        }
    };

    return (
        <table className="grading-table">
            <thead>
                <tr>
                    <th>שאלה</th>
                    <th>תשובת התלמידה (מפוענח)</th>
                    <th>הערכת AI</th>
                    <th>מה חסר?</th>
                    <th>המלצת ניקוד</th>
                    <th>ציון סופי</th>
                </tr>
            </thead>
            <tbody>
                {questions.map((q) => (
                    <tr key={q.id}>
                        <td style={{ fontWeight: 'bold' }}>{q.questionNumber}</td>
                        <td>{q.studentAnswer}</td>
                        <td>
                            <span className={`badge ${q.aiEvaluation}`}>
                                {getEvaluationLabel(q.aiEvaluation)}
                            </span>
                        </td>
                        <td>
                            {q.missingInfo ? (
                                <span className="missing-info-text">{q.missingInfo}</span>
                            ) : (
                                <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                        </td>
                        <td style={{ textAlign: 'center' }}>{q.recommendedScore}</td>
                        <td style={{ textAlign: 'center' }}>
                            <input
                                type="number"
                                className="score-input"
                                value={q.finalScore}
                                onChange={(e) => onScoreChange(q.id, Number(e.target.value))}
                                min={0}
                            />
                        </td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="total-score-row">
                    <td colSpan={5} style={{ textAlign: 'left', fontWeight: 'bold' }}>ציון סופי משוקלל:</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#2563eb' }}>
                        {questions.reduce((sum, q) => sum + q.finalScore, 0)}
                    </td>
                </tr>
            </tfoot>
        </table>
    );
};

export default GradingTable;