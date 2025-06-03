// frontend/src/components/SuggestionList.jsx
import React from 'react';
import './SuggestionList.css'; // 我们将创建这个 CSS 文件

function SuggestionList({ suggestions, activeSuggestionIndex, onSuggestionClick, onSuggestionHover }) {
    if (!suggestions || suggestions.length === 0) {
        return null;
    }

    return (
        <ul className="suggestion-list">
            {suggestions.map((suggestion, index) => (
                <li
                    key={suggestion.name} // 或者 suggestion.path 如果更唯一
                    className={`suggestion-item ${index === activeSuggestionIndex ? 'active' : ''}`}
                    onClick={() => onSuggestionClick(suggestion)}
                    onMouseEnter={() => onSuggestionHover && onSuggestionHover(index)} // 可选
                >
                    📁 {suggestion.name} {/* 显示文件夹图标和名称 */}
                </li>
            ))}
        </ul>
    );
}

export default SuggestionList;