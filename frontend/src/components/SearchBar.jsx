// frontend/src/components/SearchBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import './SearchBar.css';
import GoSearch_logo from "../assets/images/GoSearch.svg";
import {SetAppConfig} from "../../wailsjs/go/controller/API.js";
import {toast} from "react-toastify";
import {useTranslation} from "react-i18next";
import SystemMonitor from "./SystemMonitor.jsx"; // 为 SearchBar 创建一个 CSS 文件
import { useNavigation } from '../context/NavigationContext'; // 导入 useNavigation

function SearchBar({ currentTheme, onChangeTheme, isLoading}) {
    const { t, i18n } = useTranslation(); // 获取翻译函数
    const { currentPage, navigateTo } = useNavigation(); // 使用 Context
    const inputRef = useRef(null); // 用于聚焦输入框
    const [inputValue, setInputValue] = useState();
    const [showSystemMonitor, setShowSystemMonitor] = useState(false); // 控制监控弹窗
    const [currentLanguage, setCurrentLanguage] = useState(() => localStorage.getItem('appLanguage') || i18n.language || 'en');

    // 应用主题
    useEffect(() => {
        document.body.className = '';
        document.body.classList.add(`theme-${currentTheme}`);
        localStorage.setItem('appTheme', currentTheme);
    }, [currentTheme]);

    // 应用语言
    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage);
        }
        localStorage.setItem('appLanguage', currentLanguage);
    }, [currentLanguage, i18n]);

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
            inputRef.current.focus();
        }
    };

    // 打开系统监视器
    const toggleSystemMonitor = () => {
        setShowSystemMonitor(prev => !prev);
    };

    return (
        <header className="app-header">
            <div className="logo-area">
                <img src={GoSearch_logo} alt="GoSearch Logo" className="header-logo"/>
                <span className="app-title" onClick={() => navigateTo('home')} style={{cursor: 'pointer'}}
                      title={t('GoSearch')}>
                    GoSearch
                  </span>
            </div>
            {/*/!*显示搜索栏*!/*/}
            {/*{currentPage === 'home' && (*/}
            {/*    <div className="search-area">*/}
            {/*         <form onSubmit={handleSubmit} className="search-bar-container">*/}
            {/*             <div className="search-input-wrapper">*/}
            {/*                 <input*/}
            {/*                    ref={inputRef}*/}
            {/*                    type="text"*/}
            {/*                    value={inputValue}*/}
            {/*                    onChange={(e) => setInputValue(e.target.value)}*/}
            {/*                    placeholder="Search files (e.g., 'report.docx' or 'images from last week > 1MB')"*/}
            {/*                    className="search-input-field"*/}
            {/*                    disabled={isLoading}*/}
            {/*                    aria-label="Search files"*/}
            {/*                />*/}
            {/*                {inputValue && !isLoading && (*/}
            {/*                    <button*/}
            {/*                        type="button"*/}
            {/*                        onClick={handleClearInput}*/}
            {/*                        className="clear-input-btn"*/}
            {/*                        aria-label="Clear search input"*/}
            {/*                    >*/}
            {/*                        ×*/}
            {/*                    </button>*/}
            {/*                )}*/}
            {/*            </div>*/}
            {/*            <button*/}
            {/*                type="submit"*/}
            {/*                className="search-submit-btn"*/}
            {/*                disabled={isLoading}*/}
            {/*                aria-label="Submit search"*/}
            {/*            >*/}
            {/*                {isLoading ? (*/}
            {/*                    <span className="spinner" aria-hidden="true"></span>*/}
            {/*                ) : (*/}
            {/*                    'Search'*/}
            {/*                )}*/}
            {/*            </button>*/}
            {/*        </form>*/}
            {/*    </div>*/}
            {/*)}*/}
            <div className="settings-action-area">
                {/* 系统监控触发按钮 */}
                <button
                    type="button"
                    onClick={toggleSystemMonitor}
                    className="system-monitor-toggle-btn"
                    title={t('Toggle System Monitor')}
                    aria-expanded={showSystemMonitor}
                >
                    📊
                </button>
                <button onClick={() => onChangeTheme(currentTheme === 'light' ? 'dark' : 'light')}
                        className="theme-toggle-btn"
                        title={`Switch to ${currentTheme === 'light' ? t('Dark') : t('Light')} Mode`}>
                    {currentTheme === 'light' ? '🌙' : '☀️'}
                </button>
                {currentPage !== 'settings' ? (
                    <button onClick={() => navigateTo('settings')} className="settings-btn" title={t('Settings')}>
                        ⚙️
                    </button>
                ) : (
                    <button onClick={() => navigateTo('home')} className="settings-btn" title={t('Back to Home')}>
                        ↩️
                    </button>
                )}
            </div>
            {/* 条件渲染 SystemMonitor 组件 */}
            <SystemMonitor isOpen={showSystemMonitor} onClose={toggleSystemMonitor} />
        </header>
    );
}

export default SearchBar;