import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import SettingsPage from './page/Settings.jsx'; // 确保路径正确，之前是 Settings.jsx
import i18n from './assets/config/i18n.js';
import GoSearch_logo from './assets/images/GoSearch.svg';
import { ToastContainer, toast } from 'react-toastify'; // 导入 ToastContainer 和 toast 函数
import { I18nextProvider, useTranslation } from 'react-i18next';
import 'react-toastify/dist/ReactToastify.css'; // 导入默认样式
import './App.css';

import { GetAppConfig, SetAppConfig } from '../wailsjs/go/controller/API'; // 调整路径
import { GetInitialDir, GetAppStatus } from '../wailsjs/go/controller/DirController';

function AppContent() {
    const { t, i18n } = useTranslation(); // 获取翻译函数
    const [currentPage, setCurrentPage] = useState('home');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const [appStatus, setAppStatus] = useState({ isIndexing: false, totalFiles: 0, indexedDirsCount: 0 });
    const [hasIndexedDirectories, setHasIndexedDirectories] = useState(false);
    // --- 主题和语言状态管理 ---
    const [theme, setTheme] = useState(() => localStorage.getItem('appTheme') || 'light');
    const [currentLanguage, setCurrentLanguage] = useState(() => localStorage.getItem('appLanguage') || i18n.language || 'en');
    const [initialAppConfig, setInitialAppConfig] = useState(null); // 存储从后端加载的完整配置

    // 应用主题
    useEffect(() => {
        document.body.className = '';
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('appTheme', theme);
    }, [theme]);

    // 应用语言
    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage);
        }
        localStorage.setItem('appLanguage', currentLanguage);
    }, [currentLanguage, i18n]);

    // --- 应用启动时加载初始配置 ---
    useEffect(() => {
        const loadInitialConfig = async () => {
            try {
                const appConfig = await GetAppConfig(); // 直接调用 API
                if (appConfig) {
                    setInitialAppConfig(appConfig);
                    setTheme(appConfig.theme || 'light');
                    setCurrentLanguage(appConfig.language || 'en');
                    if (appConfig.language && i18n.language !== appConfig.language) {
                        await i18n.changeLanguage(appConfig.language);
                    }
                } else {
                    console.log("No backend config found on mount, using localStorage/defaults.");
                }
            } catch (error) {
                console.error("Error fetching app config on mount:", error);
            }
            // 获取其他初始数据
            await fetchInitialData();
        };
        loadInitialConfig();
    }, []);

    // 从后端获取数据
    const fetchInitialData = useCallback(async () => {
        try {
            const [status, dirs] = await Promise.all([
                GetAppStatus(),
                GetInitialDir()
            ]);
            // setAppStatus(status || { isIndexing: false, totalFiles: 0 });
            // setHasIndexedDirectories(dirs && dirs.length > 0);
            // setAppStatus(prevStatus => ({ ...prevStatus, indexedDirsCount: dirs ? dirs.length : 0 }));
        } catch (error) {
            console.error("Error fetching app status/dirs:", error);
        }
    }, []);

    // 当配置（如索引目录）在 SettingsPage 中被更改并保存到后端后, SettingsPage 可以调用这个回调来让 App.jsx 刷新相关数据。
    const handleSettingsChanged = useCallback(() => {
        fetchInitialData();
        console.log('Settings changed, refetched initial data.');
    }, [fetchInitialData]);

    // 切换主题
    const handleThemeChange = async (newTheme) => {
        setTheme(newTheme);
        console.log("Theme changed to:", newTheme)
        try {
            let configToSave = {
                ...(initialAppConfig || {}), // 基于初始加载的配置
                theme: newTheme,
            };

            await SetAppConfig(configToSave);
            setInitialAppConfig(configToSave);
            toast.success(t('Theme Changed successfully!'));
        } catch (error) {
            console.error("Error saving theme to backend:", error);
        }
    };

    // 切换语言
    const handleLanguageChange = useCallback(async (newLang) => {
        try {
            if (i18n.language !== newLang) {
                await i18n.changeLanguage(newLang);
            }
            localStorage.setItem('appLanguage', newLang);
            setCurrentLanguage(newLang); // 更新 App.jsx 的 state
            toast.success(t('Language Changed successfully!'));
            // 实时保存语言到后端 (如果你采用这种策略)
            let configToSave = {
                ...(initialAppConfig || {}),
                language: newLang,
            };

            await SetAppConfig(configToSave);
            setInitialAppConfig(configToSave);
        } catch (error) {
            console.error("Error changing language in App.jsx:", error);
        }
    }, [i18n, initialAppConfig, theme]);

    const toastContainerStyle = {
        marginTop: '70px',
    };

    const navigateToSettings = () => setCurrentPage('settings');
    const navigateToHome = () => setCurrentPage('home');

    return (
        <div className={`app-container`}>
            <header className="app-header">
                {/* ... logo, title ... */}
                <div className="logo-area">
                    <img src={GoSearch_logo} alt="GoSearch Logo" className="header-logo" />
                    <span className="app-title" onClick={navigateToHome} style={{cursor: 'pointer'}} title={t('Go to Home')}>
                    GoSearch
                  </span>
                </div>
                {currentPage === 'home' && (
                    <div className="search-area">
                        <SearchBar
                            // onSearch={handleSearchSubmit}
                            isLoading={isLoadingSearch}
                            initialTerm={searchTerm}
                            placeholderText={t('Search files placeholder')}
                        />
                    </div>
                )}
                <div className="settings-action-area">
                    <button onClick={() => handleThemeChange(theme === 'light' ? 'dark' : 'light')} className="theme-toggle-btn" title={`Switch to ${theme === 'light' ? t('Dark') : t('Light')} Mode`}>
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                    {currentPage === 'home' ? (
                        <button onClick={navigateToSettings} className="settings-btn" title={t('Settings')}>
                            ⚙️
                        </button>
                    ) : (
                        <button onClick={navigateToHome} className="settings-btn" title={t('Back to Home')}>
                            ↩️
                        </button>
                    )}
                </div>
            </header>

            <main className={`app-main-content ${currentPage === 'home' && (searchResults.length > 0 || isLoadingSearch) ? 'results-mode' : 'initial-mode'}`}>
                {currentPage === 'home' && (
                    <>
                        {(searchResults.length > 0 || isLoadingSearch) ? (
                            <div>Search Results Area {/* Replace with ResultsList and PreviewPane */}</div>
                        ) : (
                            <div className="initial-view">
                                <img src={GoSearch_logo} alt="GoSearch Logo" className="initial-logo" />
                                <h2>{t('Welcome to GoSearch!')}</h2>
                                {!hasIndexedDirectories && !appStatus.isIndexing && (
                                    <>
                                        <p className="initial-prompt">
                                            {t('To get started, please add some directories to index in the settings.')}
                                        </p>
                                        <button onClick={navigateToSettings}
                                                className="initial-settings-link">{t('Go to Settings')}</button>
                                    </>
                                )}
                                {hasIndexedDirectories && !appStatus.isIndexing && (
                                    <p className="initial-prompt">
                                        {t('Type in the search bar above to find your files.')}
                                    </p>
                                )}
                                {appStatus.isIndexing && (
                                    <p className="initial-prompt indexing-status">
                                        {t('Currently indexing your files... Please wait.')}
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}

                {currentPage === 'settings' && (
                    <SettingsPage
                        currentTheme={theme}
                        onChangeTheme={handleThemeChange}
                        currentLanguage={currentLanguage}
                        onChangeLanguage={handleLanguageChange}
                        onDirectoriesChanged={handleSettingsChanged}
                    />
                )}
            </main>
            {/* <StatusBar status={appStatus} /> */}

            <ToastContainer
                position="top-right" // 通知出现的位置
                autoClose={1000}     // 自动关闭延迟（毫秒），5000ms = 5秒
                hideProgressBar={false} // 是否隐藏进度条
                newestOnTop={true}  // 新通知是否出现在旧通知上方
                closeOnClick         // 点击通知时关闭
                rtl={false}          // 是否从右到左显示
                pauseOnFocusLoss     // 失去焦点时暂停自动关闭
                draggable            // 是否可拖拽关闭
                theme={theme}        // 主题: "light", "dark", "colored"
                style={toastContainerStyle}
            />
        </div>
    );
}

function App() {

    return (
        <I18nextProvider i18n={i18n}>
            <AppContent />
        </I18nextProvider>
    );
}

export default App;