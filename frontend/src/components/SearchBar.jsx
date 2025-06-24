import React, { useState, useEffect, useRef } from 'react';
import './SearchBar.css';
import GoSearch_logo from "../assets/images/GoSearch.svg";
import {useTranslation} from "react-i18next";
import SystemMonitor from "./SystemMonitor.jsx"; // 为 SearchBar 创建一个 CSS 文件
import { useNavigation } from '../context/NavigationContext'; // 导入 useNavigation

function SearchBar({ currentTheme, onChangeTheme }) {
    const { t, i18n } = useTranslation(); // 获取翻译函数
    const { currentPage, navigateTo } = useNavigation(); // 使用 Context
    useRef(null);
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