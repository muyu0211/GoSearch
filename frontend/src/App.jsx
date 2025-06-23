import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import SettingsPage from './page/Settings.jsx';
import Explorer from './page/Explorer.jsx';
import i18n from './assets/config/i18n.js';
import GoSearch_logo from './assets/images/GoSearch.svg';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ToastContainer, toast } from 'react-toastify';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { GetAppConfig, SetAppConfig, GetUserData } from '../wailsjs/go/controller/API';
import { GetDiskInfo } from '../wailsjs/go/controller/DirController';

function AppContent() {
    const { t, i18n } = useTranslation(); // 获取翻译函数
    const { currentPage, navigateTo } = useNavigation();
    const [initialAppConfig, setInitialAppConfig] = useState(null); // 存储完整配置
    const [initialUserData, setInitialUserData] = useState(null); // 存储用户数据
    const [isLoading, setIsLoading] = useState(true);
    const [theme, setTheme] = useState(() => localStorage.getItem('appTheme') || 'light');

    // 从后端获取数据
    const fetchInitialData = useCallback(async () => {
        try {
            const [userData] = await Promise.all([
                // GetDiskInfo(),
                GetUserData(),
            ]);
        } catch (error) {
            toast.error(t("Error fetching app status/dirs:", error));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    // --- 应用启动时加载初始配置和用户数据 ---
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

    // 更换主题
    const handleThemeChange = async (newTheme) => {
        setTheme(newTheme);
        try {
            let configToSave = {
                ...(initialAppConfig || {}), 
                theme: newTheme,
            };

            await SetAppConfig(configToSave);
            setInitialAppConfig(configToSave);
            toast.success(t('Theme Changed successfully!'));
        } catch (error) {
            console.error("Error saving theme to backend:", error);
        }
    };

    let mainContentDisplayMode = 'initial-mode';
    if (currentPage === 'explorer' && !isLoading) {
        mainContentDisplayMode = 'disk-mode';
    }

    let mainContent = null;
    if (isLoading && currentPage !== 'settings') { // 初始加载时显示 loading，除非是设置页
        mainContent = <div className="initial-view"><p className="initial-prompt indexing-status">{t('Loading')}</p></div>;
    }else {
        switch (currentPage){
            case 'home':
                mainContent = (
                    <div className="initial-view">
                        <img src={GoSearch_logo} alt="GoSearch Logo" className="initial-logo" />
                        <h2>{t('Welcome to GoSearch!')}</h2>
                        <button onClick={() => navigateTo("explorer")} className="initial-settings-link">
                            {t('Go to My Device')}
                        </button>
                    </div>
                );
                break
            case 'settings':
                mainContent = (
                    <SettingsPage
                        currentTheme={theme}
                        onChangeTheme={handleThemeChange}
                        initialAppConfig={initialAppConfig}
                        setInitialAppConfig={setInitialAppConfig}
                        initialUserData={initialUserData}
                        setInitialUserData={setInitialUserData}
                    />
                );
                break
            case 'explorer':
                mainContent = <Explorer/>;
                break;
            default:
                mainContent = <div>{t('Page not found')}</div>;
        }
    }

    return (
        <div className={`app-container`}>
            <SearchBar
                currentTheme={theme}
                onChangeTheme={handleThemeChange}
                isLoading={isLoading}
            />
            <main className={`app-main-content ${mainContentDisplayMode}`}>
                {mainContent}
            </main>
            <ToastContainer
                position="top-center"
                autoClose={1500} // 稍微加长一点时间
                hideProgressBar={false}
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                theme={theme}
                style={{ marginTop: '-10px' }} // 调整以避开头部
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