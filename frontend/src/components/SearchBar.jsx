// frontend/src/components/SearchBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import './SearchBar.css'; // 为 SearchBar 创建一个 CSS 文件

function SearchBar({ onSearch, onNaturalSearch, isLoading, initialTerm = '' }) {
    const [inputValue, setInputValue] = useState(initialTerm);
    const inputRef = useRef(null); // 用于聚焦输入框

    // 当外部 initialTerm 改变时，同步到输入框
    useEffect(() => {
        setInputValue(initialTerm);
    }, [initialTerm]);

    // 允许用户按 Enter 键提交表单
    const handleSubmit = (e) => {
        e.preventDefault();
        if (isLoading) return; // 防止在加载时重复提交

        const query = inputValue.trim();
        if (!query) {
            // 可以选择在这里提示用户输入内容，或者让 onSearch 处理空查询
            onSearch(""); // 或者 onSearch(null) 等，根据你的 App.jsx 逻辑
            return;
        }

        // 非常简单的关键词检测，判断是否可能是一个“自然语言”查询
        // 实际应用中，这个判断逻辑可能更复杂，或者由用户通过特定按钮触发
        const nlKeywords = ['last week', 'yesterday', 'today', 'greater than', 'less than', 'images', 'documents', 'videos', 'audio', 'code', 'type:', 'size:', 'date:'];
        const isLikelyNL = nlKeywords.some(keyword => inputValue.toLowerCase().includes(keyword));

        if (isLikelyNL && onNaturalSearch) {
            onNaturalSearch(inputValue);
        } else {
            onSearch(inputValue);
        }
    };

    // 清除输入框内容
    const handleClearInput = () => {
        setInputValue('');
        if (inputRef.current) {
            inputRef.current.focus(); // 清除后重新聚焦
        }
        onSearch(""); // 清除后也触发一次空搜索，以清空结果列表
    };

    return (
        <form onSubmit={handleSubmit} className="search-bar-container">
            <div className="search-input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Search files (e.g., 'report.docx' or 'images from last week > 1MB')"
                    className="search-input-field"
                    disabled={isLoading}
                    aria-label="Search files"
                />
                {inputValue && !isLoading && (
                    <button
                        type="button"
                        onClick={handleClearInput}
                        className="clear-input-btn"
                        aria-label="Clear search input"
                    >
                        × {/* 'X' character for clear */}
                    </button>
                )}
            </div>
            <button
                type="submit"
                className="search-submit-btn"
                disabled={isLoading}
                aria-label="Submit search"
            >
                {isLoading ? (
                    <span className="spinner" aria-hidden="true"></span> // 简单的 CSS spinner
                ) : (
                    'Search'
                )}
            </button>
        </form>
    );
}

export default SearchBar;