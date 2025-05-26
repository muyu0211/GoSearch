import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import SettingsPage from './page/Settings.jsx';
import DiskExplorer from './page/DiskExplorer';
import i18n from './assets/config/i18n.js';
import GoSearch_logo from './assets/images/GoSearch.svg';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ToastContainer, toast } from 'react-toastify';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { GetAppConfig, SetAppConfig } from '../wailsjs/go/controller/API';
import { GetAppStatus, GetDiskInfo } from '../wailsjs/go/controller/DirController';

function AppContent() {
    const { t, i18n } = useTranslation(); // 获取翻译函数
    const { currentPage, navigateTo } = useNavigation();
    const [initialAppConfig, setInitialAppConfig] = useState(null); // 存储从后端加载的完整配置
    const [currentQuery, setCurrentQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [diskInfos, setDiskInfos] = useState([]); // <--- 改名并用于存储磁盘信息
    // --- 主题状态管理 ---
    const [theme, setTheme] = useState(() => localStorage.getItem('appTheme') || 'light');

    // 从后端获取数据
    const fetchInitialData = useCallback(async () => {
        try {
            const [diskInfos] = await Promise.all([
                // GetAppStatus(),
                GetDiskInfo(),
            ]);
            setDiskInfos(diskInfos)
        } catch (error) {
            toast.error(t("Error fetching app status/dirs:", error));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    // --- 应用启动时加载初始配置 ---
    useEffect(() => {
        const loadInitialConfig = async () => {
            try {
                const appConfig = await GetAppConfig();
                if (appConfig) {
                    setInitialAppConfig(appConfig);
                    setTheme(appConfig.theme || 'light');
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
    }, [fetchInitialData]);

    //  更换主题
    const handleThemeChange = async (newTheme) => {
        setTheme(newTheme);
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

    // 计算主内容区域的模式
    const isHomePage = currentPage === 'home'
    const showInitialPrompt = isHomePage && !isLoading && diskInfos.length === 0;
    const showDiskExplorer = isHomePage && !isLoading;
    const showSearchResultsArea = isHomePage && (isLoading || searchResults.length > 0 || currentQuery);

    let mainContentDisplayMode = 'initial-mode';
    if (showSearchResultsArea) {
        mainContentDisplayMode = 'results-mode';
    } else if (showDiskExplorer) {
        mainContentDisplayMode = 'disk-mode';
    }
    return (
        <div className={`app-container`}>
            <SearchBar
                currentTheme={theme}
                onChangeTheme={handleThemeChange}
                isLoading={isLoading}
            />
            <main className={`app-main-content ${mainContentDisplayMode}`}>
                {currentPage === 'home' && (
                    <>
                        {showSearchResultsArea ? (
                            <div>Search Results Area {/* ... */}</div>
                        ) : showDiskExplorer ? (
                            <DiskExplorer/>
                        ) : (
                            <div className="initial-view">
                                <img src={GoSearch_logo} alt="GoSearch Logo" className="initial-logo" />
                                <h2>{t('Welcome to GoSearch!')}</h2>
                                {isLoading && (
                                    <p className="initial-prompt indexing-status">{t('Loading')}</p>
                                )}
                                {showInitialPrompt && !isLoading && ( // 确保在不显示 DiskExplorer 时才显示这个
                                    <>
                                        <p className="initial-prompt">
                                            {t('To get started, please add some directories to index in the settings.')}
                                        </p>
                                        <button onClick={() => navigateTo("setting")}
                                                className="initial-settings-link">{t('Go to Settings')}</button>
                                    </>
                                )}
                                {hasIndexedDirectories && !appStatus.isIndexing && !isLoadingInitialData && (
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
                        initialAppConfig={initialAppConfig}
                        setInitialAppConfig={setInitialAppConfig}
                        // onDirectoriesChanged={handleSettingsChanged}
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
                style={{
                    marginTop: '70px',
                }}
            />
        </div>
    );
}

function App() {
    return (
        <NavigationProvider>
            <I18nextProvider i18n={i18n}>
                <AppContent />
            </I18nextProvider>
        </NavigationProvider>
    );
}

export default App;