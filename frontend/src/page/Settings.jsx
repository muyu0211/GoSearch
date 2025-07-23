import React, {useState, useEffect, useCallback} from 'react';
import { useTranslation } from 'react-i18next';
import './Settings.css';
import ConfirmModal from "../components/ConfirmModal.jsx";
import {toast} from "react-toastify";
import {
    OpenDirectory,
} from '../../wailsjs/go/controller/DirController';
import {
    GetAppConfig,
    GetBootConfig,
    GetUserData,
    SetAppConfig,
    SetBootConfig,
    SetUserData,
    TestLLM,
} from '../../wailsjs/go/controller/API';

function SettingsPage({ currentTheme, onChangeTheme, initialAppConfig, setInitialAppConfig, initialUserData, setInitialUserData }) {
    const { t, i18n } = useTranslation();
    const [appConfig, setAppConfig] = useState(null); // 存储从后端加载的 AppConfig
    const [bootConfig, setBootConfig] = useState(null); // 存储从后端加载的 BootConfig
    const [userData, setUserData] = useState(null)
    const [isLoading, setIsLoading] = useState(true);
    const [currentLanguage, setCurrentLanguage] = useState(() => localStorage.getItem('appLanguage') || i18n.language || 'en');
    const [showLanguageConfirm, setShowLanguageConfirm] = useState(false);
    const [targetLanguage, setTargetLanguage] = useState('');
    const [isChangingConfigDir, setIsChangingConfigDir] = useState(false);
    // --- LLM 配置相关的 State ---
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [baseURL, setBaseURL] = useState('');
    const [isSavingUserData, setIsSavingUserData] = useState(false);
    const [isTestingLLM, setIsTestingLLM] = useState(false);

    // 加载页面数据
    const fetchPageData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [appConf, bootConf, userData] = await Promise.all([
                GetAppConfig(),
                GetBootConfig(),
                GetUserData(),
            ]);
            setAppConfig(appConf || {});
            setBootConfig(bootConf || {});
            setUserData(userData || {})

            if (userData) {
                setApiKey(userData.api_key || '')
                setModel(userData.model || '');
                setBaseURL(userData.base_url || '');
            }
        } catch (err) {
            toast.error(t("Could not load settings data."))
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    // 加载组件
    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    // 应用主题
    useEffect(() => {
        document.body.className = '';
        document.body.classList.add(`theme-${currentTheme}`);
        localStorage.setItem('appTheme', currentTheme);
    }, [currentTheme]);

    // 修改配置文件目录
    const handleChangeConfigDir = async () => {
        try {
            // 打开目录选择器
            const newConfigDir = await OpenDirectory(bootConfig?.custom_config_dir);
            if (newConfigDir) {
                const currentMasterDir = bootConfig?.custom_config_dir;
                if (newConfigDir === currentMasterDir) {
                    toast.info(t("The selected directory is the same as the current one."));
                    return;
                }

                setIsChangingConfigDir(true);
                await SetBootConfig(newConfigDir);      // 更新后端BootConfig
                toast.success(t("Data and configuration directory changed successfully! An application restart may be required for all changes to take full effect."));
                await fetchPageData(); // 这会更新 bootConfig 和 appConfig
            }else{
                toast.info(t("You have canceled the change to the catalog"))
            }
        } catch (err) {
            const errorMsg = err && typeof err.message === 'string' ? err.message : t("Failed to change data directory. Ensure the new path is valid and writable.");
            toast.error(errorMsg);
        } finally {
            setIsChangingConfigDir(false);
        }
    };

    // 保存大模型配置
    const handleLLMChange = async (event) => {
        if (event) event.preventDefault()
        try {
            const userDataToSave = {
                ...(userData || {}),
                api_key: apiKey.trim(),
                model: model.trim(),
                base_url: baseURL.trim(),
            }
            await SetUserData(userDataToSave);
            toast.success(t('User Data saved successfully!'));
        } catch (error) {
            const errMsg = error && typeof error.message === 'string' ? error.message : t('Failed to save LLM configuration.');
            toast.error(errMsg)
        } finally {
            setIsSavingUserData(false);
        }
    }

    const handleTestLLMConnection = async () => {
        setIsTestingLLM(true);
        // toast.info(t('Testing LLM connection...')); // 给用户一个即时反馈
        try {
            await TestLLM();
        } catch (err) {
        } finally {
            setIsTestingLLM(false);
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
                ...(appConfig || {}),
                language: newLang,
            };

            await SetAppConfig(configToSave);
            setInitialAppConfig(configToSave);
        } catch (error) {
            console.error("Error changing language in App.jsx:", error);
        }
    }, [i18n, initialAppConfig]);

    const promptChangeLanguage = (lng) => {
        if (lng && lng !== currentLanguage) {
            setTargetLanguage(lng);
            setShowLanguageConfirm(true);
        }else if (lng === currentLanguage) {
            toast.info(t("You are already using this language."));
        }
    };

    const confirmChangeLanguage = async () => {
        if (targetLanguage) {
            // await onChangeLanguage(targetLanguage); // 调用 App.jsx 传递过来的函数
            await handleLanguageChange(targetLanguage)
        }
        setShowLanguageConfirm(false);
        setTargetLanguage('');
    };

    const cancelChangeLanguage = () => {
        setShowLanguageConfirm(false);
        setTargetLanguage('');
    };

    if (isLoading) {
        return <div className="settings-page-container"><p>{t('Loading settings...')}</p></div>;
    }

    return (
        <div className="settings-page-container">
            <h1 className="settings-title">{t('Settings')}</h1>

            <section className="settings-section">
                <h2>{t('About GoSearch')}</h2>
                <p>{t('GoSearch is a blazing fast local file search and preview tool, built with Go and React.')}</p>
                <p>{t('It aims to provide a seamless and efficient way to find your files instantly.')}</p>
                <p>{t('AppName')}: {appConfig?.app_name || 'GoSearch'}</p>
                <p>{t('Version')}: {appConfig?.app_version || '0.1.0 (Alpha)'}</p>
            </section>

            <section className="settings-section">
                <h2>{t('LLM Configuration')}</h2>
                <form onSubmit={handleLLMChange}>
                    <div className="settings-form-group">
                        <label htmlFor="llmApiKey">{t('API Key')}:</label>
                        <input
                            type="text"
                            id="apiKey"
                            className="settings-input"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={t('Enter your LLM API Key')}
                            // disabled={isSavingUserData || isLoading}
                        />
                    </div>
                    <div className="settings-form-group">
                        <label htmlFor="llmModel">{t('Model Name')}:</label>
                        <input
                            type="text"
                            id="model"
                            className="settings-input"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder={t('e.g., gpt-3.5-turbo, claude-2')}
                            // disabled={isSavingLLMConfig || isLoading}
                        />
                    </div>
                    <div className="settings-form-group">
                        <label htmlFor="llmBaseURL">{t('Base URL')}:</label>
                        <input
                            type="text"
                            id="baseURL"
                            className="settings-input"
                            value={baseURL}
                            onChange={(e) => setBaseURL(e.target.value)}
                            placeholder={t('e.g., https://api.openai.com/v1')}
                        />
                    </div>
                    <div className="settings-actions-group"> {/* 用于排列保存和测试按钮 */}
                        <button type="submit" className="settings-save-btn" disabled={isSavingUserData || isLoading}>
                            {isSavingUserData ? t('Saving...') : t('Save LLM Settings')}
                        </button>
                        <button type="button" className="settings-test-btn"
                                onClick={handleTestLLMConnection}
                                disabled={isTestingLLM || isLoading || isSavingUserData || !apiKey.trim()}>
                            {isTestingLLM ? t('Testing...') : t('Test Connection')}
                        </button>
                    </div>
                </form>
            </section>

            <section className="settings-section">
                <h2>{t('Data and Configuration Directory')}</h2>
                <div className="dir-path-display" title={bootConfig?.custom_config_dir}>
                    {bootConfig?.custom_config_dir || t('Loading...')}
                </div>

                <p className="settings-note">
                    {t('Changing this directory will move where GoSearch stores its main configuration (like theme, language) and all its data (like file indexes). This might require an app restart and data re-indexing if not migrated automatically.')}
                </p>
                <button
                    onClick={handleChangeConfigDir}
                    className="change-dir-btn"
                    disabled={isLoading || isChangingConfigDir}
                >
                    {isChangingConfigDir ? t('Changing') : t('Change Directory')}
                </button>
            </section>

            <section className="settings-section">
                <h2>{t('Language')}</h2>
                <div className="language-options">
                    <button
                        onClick={() => promptChangeLanguage('en')} // 调用 prop
                        className={currentLanguage === 'en' ? 'active' : ''}
                        disabled={isLoading}
                    >
                        English
                    </button>
                    <button
                        onClick={() => promptChangeLanguage('zh-CN')} // 调用 prop
                        className={currentLanguage === 'zh-CN' ? 'active' : ''}
                        disabled={isLoading}
                    >
                        简体中文
                    </button>
                </div>
            </section>

            <section className="settings-section">
                <h2>{t('Theme')}</h2>
                <div className="theme-options">
                    <button
                        onClick={() => onChangeTheme('light')} // 调用 prop
                        className={currentTheme === 'light' ? 'active' : ''}
                        disabled={isLoading}
                    >
                        {t('Light')}
                    </button>
                    <button
                        onClick={() => onChangeTheme('dark')} // 调用 prop
                        className={currentTheme === 'dark' ? 'active' : ''}
                        disabled={isLoading}
                    >
                        {t('Dark')}
                    </button>
                </div>
            </section>

            <ConfirmModal
                isOpen={showLanguageConfirm}
                title={t('Confirm Language Change')}
                message={t('Are you sure you want to change the language to {{lang}}?', {lang: targetLanguage === 'en' ? 'English' : '中文'})}
                onConfirm={confirmChangeLanguage}
                onCancel={cancelChangeLanguage}
                confirmText={t('Change')}
                cancelText={t('Cancel')}
            />
        </div>
    );
}

export default SettingsPage;