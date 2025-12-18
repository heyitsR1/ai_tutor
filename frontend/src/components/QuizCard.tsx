import { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, ChevronRight, Trophy } from 'lucide-react';

interface Question {
    question: string;
    options: string[];
    correct_answer: string;
    hint?: string;
    xp_reward: number;
    explanation?: string;
}

interface QuizCardProps {
    data: {
        questions?: Question[];
        // Legacy single question format
        question?: string;
        options?: string[];
        correct_answer?: string;
        hint?: string;
        xp_reward?: number;
        explanation?: string;
    };
    onComplete?: (xp: number) => void;
}

export function QuizCard({ data, onComplete }: QuizCardProps) {
    // Normalize data to always work with questions array
    const questions: Question[] = data.questions || [{
        question: data.question || '',
        options: data.options || [],
        correct_answer: data.correct_answer || '',
        hint: data.hint,
        xp_reward: data.xp_reward || 100,
        explanation: data.explanation
    }];

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [questionCompleted, setQuestionCompleted] = useState(false);
    const [totalXpEarned, setTotalXpEarned] = useState(0);
    const [currentXpAvailable, setCurrentXpAvailable] = useState(questions[0]?.xp_reward || 100);
    const [quizFinished, setQuizFinished] = useState(false);
    const [correctAnswers, setCorrectAnswers] = useState(0);

    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    const handleSelect = (option: string) => {
        if (questionCompleted) return;
        setSelectedOption(option);
        setQuestionCompleted(true);

        const isCorrect = option === currentQuestion.correct_answer;
        if (isCorrect) {
            setTotalXpEarned(prev => prev + currentXpAvailable);
            setCorrectAnswers(prev => prev + 1);
        }
    };

    const handleNextQuestion = () => {
        if (isLastQuestion) {
            // Quiz finished
            setQuizFinished(true);
            if (onComplete) {
                onComplete(totalXpEarned);
            }
        } else {
            // Move to next question
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            setSelectedOption(null);
            setShowHint(false);
            setQuestionCompleted(false);
            setCurrentXpAvailable(questions[nextIndex]?.xp_reward || 100);
        }
    };

    const handleHint = () => {
        if (showHint || questionCompleted) return;
        setShowHint(true);
        setCurrentXpAvailable(prev => Math.max(0, prev - 50));
    };

    // Show completion summary
    if (quizFinished) {
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        return (
            <div className="w-full max-w-2xl mx-auto my-6 relative rounded-xl overflow-hidden">
                <div
                    className="relative z-10 p-6 sm:p-8 rounded-2xl text-center"
                    style={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border-light)',
                        boxShadow: 'var(--shadow-md)'
                    }}
                >
                    <div
                        className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
                        style={{
                            backgroundColor: percentage >= 70 ? 'rgba(93, 138, 102, 0.15)' : 'rgba(175, 157, 142, 0.15)',
                            color: percentage >= 70 ? 'var(--color-success)' : 'var(--color-main)'
                        }}
                    >
                        <Trophy className="w-8 h-8" />
                    </div>

                    <h3
                        className="text-xl font-bold mb-2"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        Quiz Complete!
                    </h3>

                    <p
                        className="text-sm mb-4"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        You got <strong>{correctAnswers}</strong> out of <strong>{totalQuestions}</strong> questions correct ({percentage}%)
                    </p>

                    <div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                        style={{
                            backgroundColor: 'rgba(175, 157, 142, 0.15)',
                            color: 'var(--color-accent)'
                        }}
                    >
                        <span className="text-2xl font-bold">+{totalXpEarned}</span>
                        <span className="text-xs font-semibold uppercase">XP Earned</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto my-6 relative rounded-xl overflow-hidden">
            {/* Main Card */}
            <div
                className="relative z-10 p-4 sm:p-6 rounded-2xl"
                style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border-light)',
                    boxShadow: 'var(--shadow-md)'
                }}
            >

                {/* Meta Row */}
                <div
                    className="flex items-center justify-between mb-5 pb-4"
                    style={{ borderBottom: '1px solid var(--color-border-light)' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="p-2 rounded-lg"
                            style={{
                                backgroundColor: 'rgba(175, 157, 142, 0.15)',
                                color: 'var(--color-accent)'
                            }}
                        >
                            <HelpCircle className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span
                                className="text-[10px] font-medium uppercase tracking-wider"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                Quiz
                            </span>
                            <span
                                className="text-xs font-semibold uppercase tracking-wide"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                Question {currentQuestionIndex + 1} of {totalQuestions}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div
                            className="text-2xl font-bold tracking-tight"
                            style={{ color: 'var(--color-accent)' }}
                        >
                            {currentXpAvailable}
                        </div>
                        <div
                            className="text-[10px] font-medium uppercase tracking-wider"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            XP Available
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                {totalQuestions > 1 && (
                    <div className="mb-5">
                        <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--color-secondary)' }}
                        >
                            <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                    width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
                                    backgroundColor: 'var(--color-accent)'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Question */}
                <div className="mb-6">
                    <h2
                        className="text-lg sm:text-xl font-semibold leading-tight"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {currentQuestion.question}
                    </h2>
                </div>

                {/* Options */}
                <div className="space-y-2.5 mb-6">
                    {currentQuestion.options.map((option, idx) => {
                        const isSelected = selectedOption === option;
                        const isCorrect = option === currentQuestion.correct_answer;

                        let bgColor = 'var(--color-surface-warm)';
                        let borderColor = 'var(--color-border-light)';
                        let textColor = 'var(--color-text-primary)';

                        if (questionCompleted) {
                            if (isCorrect) {
                                bgColor = 'rgba(93, 138, 102, 0.1)';
                                borderColor = 'var(--color-success)';
                                textColor = 'var(--color-success)';
                            } else if (isSelected && !isCorrect) {
                                bgColor = 'rgba(166, 93, 93, 0.1)';
                                borderColor = 'var(--color-error)';
                                textColor = 'var(--color-error)';
                            } else {
                                bgColor = 'var(--color-secondary)';
                                textColor = 'var(--color-text-muted)';
                            }
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleSelect(option)}
                                disabled={questionCompleted}
                                className="w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center justify-between font-medium text-sm sm:text-base"
                                style={{
                                    backgroundColor: bgColor,
                                    border: `1.5px solid ${borderColor}`,
                                    color: textColor,
                                    opacity: questionCompleted && !isCorrect && !isSelected ? 0.6 : 1,
                                    cursor: questionCompleted ? 'default' : 'pointer'
                                }}
                                onMouseOver={(e) => {
                                    if (!questionCompleted) {
                                        e.currentTarget.style.borderColor = 'var(--color-main)';
                                        e.currentTarget.style.backgroundColor = 'rgba(175, 157, 142, 0.15)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (!questionCompleted) {
                                        e.currentTarget.style.borderColor = 'var(--color-border-light)';
                                        e.currentTarget.style.backgroundColor = 'var(--color-surface-warm)';
                                    }
                                }}
                            >
                                <span>{option}</span>
                                {questionCompleted && (
                                    isCorrect ? <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                                        : (isSelected && <XCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />)
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Footer / Hint / Next Button */}
                <div className="flex flex-col gap-3">
                    {!questionCompleted && (
                        <button
                            onClick={handleHint}
                            disabled={showHint}
                            className="w-full py-3 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all"
                            style={{
                                backgroundColor: showHint ? 'var(--color-secondary)' : 'rgba(175, 157, 142, 0.15)',
                                color: showHint ? 'var(--color-text-muted)' : 'var(--color-accent)',
                                border: `1px solid ${showHint ? 'var(--color-border)' : 'rgba(116, 82, 59, 0.2)'}`,
                                cursor: showHint ? 'default' : 'pointer'
                            }}
                        >
                            {showHint ? "Hint Used (-50 XP)" : "🔒 Use Hint (-50 XP)"}
                        </button>
                    )}

                    {showHint && currentQuestion.hint && (
                        <div
                            className="p-4 rounded-xl text-sm font-medium"
                            style={{
                                backgroundColor: 'rgba(175, 157, 142, 0.1)',
                                color: 'var(--color-text-primary)',
                                border: '1px solid rgba(175, 157, 142, 0.2)'
                            }}
                        >
                            <span
                                className="font-semibold uppercase text-xs tracking-wider block mb-1"
                                style={{ color: 'var(--color-main)' }}
                            >
                                Hint:
                            </span>
                            {currentQuestion.hint}
                        </div>
                    )}

                    {questionCompleted && currentQuestion.explanation && (
                        <div
                            className="p-5 rounded-xl text-sm mt-2"
                            style={{
                                backgroundColor: 'var(--color-surface-warm)',
                                border: '1px solid var(--color-border-light)'
                            }}
                        >
                            <p
                                className="font-semibold mb-2 flex items-center gap-2 text-xs uppercase tracking-wide"
                                style={{ color: selectedOption === currentQuestion.correct_answer ? 'var(--color-success)' : 'var(--color-error)' }}
                            >
                                {selectedOption === currentQuestion.correct_answer ? "✓ Correct!" : "✗ Incorrect"}
                            </p>
                            <p
                                className="leading-relaxed"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {currentQuestion.explanation}
                            </p>
                        </div>
                    )}

                    {questionCompleted && (
                        <button
                            onClick={handleNextQuestion}
                            className="w-full py-3.5 rounded-xl text-sm font-semibold uppercase tracking-wide transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            style={{
                                backgroundColor: 'var(--color-accent)',
                                color: 'white',
                                boxShadow: '0 4px 12px rgba(116, 82, 59, 0.3)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5D4130'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
                        >
                            {isLastQuestion ? (
                                <>
                                    <Trophy className="w-4 h-4" />
                                    Finish Quiz
                                </>
                            ) : (
                                <>
                                    Next Question
                                    <ChevronRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}

