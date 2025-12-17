import React, { useState } from 'react';
import { Trophy, HelpCircle, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface QuizCardProps {
    data: {
        question: string;
        options: string[];
        correct_answer: string;
        hint?: string;
        xp_reward: number;
        explanation?: string;
    };
    onComplete?: (xp: number) => void;
}

export function QuizCard({ data, onComplete }: QuizCardProps) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [currentXp, setCurrentXp] = useState(data.xp_reward);
    const [completed, setCompleted] = useState(false);

    const handleSelect = (option: string) => {
        if (completed) return;
        setSelectedOption(option);
        setCompleted(true);

        const isCorrect = option === data.correct_answer;
        if (isCorrect && onComplete) {
            onComplete(currentXp);
        }
    };

    const handleHint = () => {
        if (showHint || completed) return;
        setShowHint(true);
        setCurrentXp(prev => Math.max(0, prev - 50));
    };

    return (
        <div className="w-full max-w-2xl mx-auto my-8 relative rounded-xl overflow-hidden font-mono">
            {/* Header Removed as per new global theme */}

            {/* Main Card */}
            <div className="relative z-10 p-2 sm:p-6">
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 p-6 sm:p-8">

                    {/* Meta Row */}
                    <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 text-purple-600 border border-purple-200 shadow-inner">
                                <HelpCircle className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Question 1 of 3</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-black text-purple-600 tracking-tight">
                                {currentXp}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                XP Available
                            </div>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="mb-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 uppercase leading-tight tracking-tight">
                            &gt; {data.question}
                        </h2>
                    </div>

                    {/* Options */}
                    <div className="space-y-3 mb-8">
                        {data.options.map((option, idx) => {
                            const isSelected = selectedOption === option;
                            const isCorrect = option === data.correct_answer;

                            let baseStyle = "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between group relative overflow-hidden font-bold tracking-tight uppercase text-sm sm:text-base";
                            let stateStyle = "bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-600 hover:shadow-md hover:bg-purple-50/50";

                            if (completed) {
                                if (isCorrect) stateStyle = "bg-green-50 border-green-400 text-green-700 shadow-sm";
                                else if (isSelected && !isCorrect) stateStyle = "bg-red-50 border-red-400 text-red-700 shadow-sm";
                                else stateStyle = "bg-slate-50 border-slate-100 text-slate-300 opacity-60";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSelect(option)}
                                    disabled={completed}
                                    className={twMerge(baseStyle, stateStyle)}
                                >
                                    <span className="relative z-10 flex items-center gap-3">
                                        <span className={clsx("opacity-50", completed && isCorrect && "text-green-600")}>&gt;</span>
                                        {option}
                                    </span>
                                    {completed && (
                                        isCorrect ? <CheckCircle2 className="text-green-500 w-5 h-5 relative z-10" />
                                            : (isSelected && <XCircle className="text-red-500 w-5 h-5 relative z-10" />)
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer / Hint */}
                    <div className="flex flex-col gap-4">
                        {!completed && (
                            <button
                                onClick={handleHint}
                                disabled={showHint}
                                className={twMerge(
                                    "w-full py-3 rounded-lg text-xs font-bold uppercase tracking-[0.15em] transition-all border",
                                    showHint
                                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-default"
                                        : "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                                )}
                            >
                                {showHint ? "[ Hint Used -50 XP ]" : "[ 🔒 Use Hint -50 XP ]"}
                            </button>
                        )}

                        {showHint && data.hint && (
                            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                                <span className="font-bold uppercase text-xs tracking-wider block mb-1 text-purple-400">Hint module decrypted:</span>
                                {data.hint}
                            </div>
                        )}

                        {completed && data.explanation && (
                            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 mt-2 animate-in fade-in slide-in-from-bottom-4">
                                <p className="font-bold text-slate-800 mb-2 flex items-center gap-2 uppercase tracking-wide text-xs">
                                    {selectedOption === data.correct_answer ? "✅ Analysis Complete" : "❌ Analysis Complete"}
                                </p>
                                <p className="text-sm leading-relaxed">{data.explanation}</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
            {/* Decorative bottom bar */}
            <div className="h-1 w-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-600" />
        </div>
    );
}
