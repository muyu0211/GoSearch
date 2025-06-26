import React, {useState, useEffect, useRef, useCallback} from 'react';
import './SearchBar.css';
import GoSearch_logo from "../assets/icon/GoSearch.svg";
import {useTranslation} from "react-i18next";
import SystemMonitor from "./SystemMonitor.jsx"; // 为 SearchBar 创建一个 CSS 文件
import { useNavigation } from '../context/NavigationContext'; // 导入 useNavigation
import {WindowMinimise, WindowToggleMaximise, Quit, WindowIsMaximised} from '../../wailsjs/runtime/runtime';

import iconSettingUrl from '../assets/icon/Setting.svg'
import iconBackUrl from '../assets/icon/Back.svg'
import iconResourceMonitorUrl from '../assets/icon/ResourceMonitor.svg'
import iconLightUrl from '../assets/icon/Light.svg'
import iconDartUrl from '../assets/icon/Dark.svg'

import iconMinimiseUrl from '../assets/icon/Minimise.svg';
import iconMaximiseUrl from '../assets/icon/Maximise.svg';
import iconNormaliseUrl from '../assets/icon/Normalise.svg';
import iconCloseUrl from '../assets/icon/Close.svg';

function SearchBar({ currentTheme, onChangeTheme }) {
    useRef(null);
    const { t, i18n } = useTranslation();
    const { currentPage, navigateTo } = useNavigation();
    const [showSystemMonitor, setShowSystemMonitor] = useState(false);
    const [isMaximised, setIsMaximised] = useState(false);
    const headerRef = useRef(null);

    // 应用主题
    useEffect(() => {
        document.body.className = '';
        document.body.classList.add(`theme-${currentTheme}`);
        localStorage.setItem('appTheme', currentTheme);
    }, [currentTheme]);

    // // 应用语言
    // useEffect(() => {
    //     if (i18n.language !== currentLanguage) {
    //         i18n.changeLanguage(currentLanguage);
    //     }
    //     localStorage.setItem('appLanguage', currentLanguage);
    // }, [currentLanguage, i18n]);

    // 获取初始最大化状态并在窗口大小变化时更新
    const updateMaximiseState = useCallback(async () => {
        try {
            const maximised = await WindowIsMaximised();
            setIsMaximised(maximised);
        } catch (error) {
            console.error("Error getting window maximised state:", error);
        }
    }, []);

    useEffect(() => {
        updateMaximiseState(); // 初始加载时获取状态

        // 示例：监听一个假设的后端事件 (如果后端实现了)
        // const cleanup = EventsOn("windowStateChanged", updateMaximiseState);
        // return () => {
        //   if (typeof cleanup === 'function') cleanup();
        // };
    }, [updateMaximiseState]);

    // 打开系统监视器
    const toggleSystemMonitor = () => {
        setShowSystemMonitor(prev => !prev);
    };

    const handleWindowMinimise = () => {
        WindowMinimise();
    };

    const handleWindowToggleMaximise = async () => {
        await WindowToggleMaximise();
        updateMaximiseState();
    };

    const handleWindowClose = () => {
        Quit(); // 这会触发 Go 后端的 OnShutdown
    };

    const handleHeaderDoubleClick = (event) => {
        // 确保双击的是可拖动区域，而不是按钮
        if (event.target === headerRef.current ||
            event.target === headerRef.current ||
            event.target.classList.contains('logo-area') ||
            event.target.classList.contains('app-title')) {
            handleWindowToggleMaximise();
        }
    };

    return (
        <header ref={headerRef} className="app-header draggable-area" onDoubleClick={handleHeaderDoubleClick}>
            <div className="logo-area non-draggable">
                <img src={GoSearch_logo} alt="GoSearch Logo" className="header-logo"/>
                <span className="app-title" onClick={() => navigateTo('home')} style={{cursor: 'pointer'}}
                      title={t('GoSearch')}>
                    GoSearch
                  </span>
            </div>
            <div className="settings-action-area non-draggable">
                <button
                    type="button"
                    onClick={toggleSystemMonitor}
                    className="header-btn system-monitor-toggle-btn"
                    title={t('Toggle System Monitor')}
                    aria-expanded={showSystemMonitor}
                >
                    <img src={iconResourceMonitorUrl} alt={""}/>
                </button>
                <button onClick={() => onChangeTheme(currentTheme === 'light' ? 'dark' : 'light')}
                        className="header-btn theme-toggle-btn"
                        title={`Switch to ${currentTheme === 'light' ? t('Dark') : t('Light')} Mode`}>
                    {currentTheme === 'light'
                        ? <img src={iconLightUrl} alt={""}/>
                        : <img src={iconDartUrl} alt={""}/>}
                </button>
                {currentPage !== 'settings' ? (
                    <button onClick={() => navigateTo('settings')} className="header-btn setting-btn" title={t('Settings')}>
                        <img src={iconSettingUrl} className="icon" alt={""}/>
                    </button>
                ) : (
                    <button onClick={() => navigateTo('home')} className="header-btn setting-btn" title={t('Back to Home')}>
                        <img src={iconBackUrl} alt={""}/>
                    </button>
                )}
                <button onClick={handleWindowMinimise} className="header-btn minimise-btn" >
                    <img src={iconMinimiseUrl} className="window-control-icon"  alt={""}/>
                </button>
                <button onClick={handleWindowToggleMaximise} className="header-btn maximise-btn" >
                    {isMaximised ? (
                        <img src={iconNormaliseUrl} className="window-control-icon" alt={""}/>
                    ) : (
                        <img src={iconMaximiseUrl} className="window-control-icon" alt={""}/>
                    )}
                </button>
                <button onClick={handleWindowClose} className="header-btn close-btn" >
                    <img src={iconCloseUrl} className="window-control-icon" alt={""}/>
                </button>
            </div>
            <SystemMonitor isOpen={showSystemMonitor} onClose={toggleSystemMonitor}/>
        </header>
    );
}

export default SearchBar;