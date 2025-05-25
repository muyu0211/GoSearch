// frontend/src/components/SettingsPage.jsx
import React, {useState, useEffect, useCallback} from 'react';
import { useTranslation } from 'react-i18next';
import './Settings.css';
import ConfirmModal from "../components/ConfirmModal.jsx";
import {toast} from "react-toastify";
import {
    GetInitialDir,
    OpenDirectory,
} from '../../wailsjs/go/controller/DirController';
import { GetAppConfig, GetBootConfig, SetBootConfig} from '../../wailsjs/go/controller/API';


function SettingsPage({ currentTheme, onChangeTheme, currentLanguage, onChangeLanguage, onDirectoriesChanged }) {
    const { t, i18n } = useTranslation(); // i18n 实例用于获取和改变语言
    const [appConfig, setAppConfig] = useState(null); // 存储从后端加载的 AppConfig
    const [bootConfig, setBootConfig] = useState(null); // 存储从后端加载的 BootConfig
    const [directories, setDirectories] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // 统一的加载状态
    const [isUpdatingDirs, setIsUpdatingDirs] = useState(false); // 用于添加/删除目录时的 loading
    const [showLanguageConfirm, setShowLanguageConfirm] = useState(false);
    const [targetLanguage, setTargetLanguage] = useState('');
    const [isChangingConfigDir, setIsChangingConfigDir] = useState(false); // 新增状态

    // 加载页面数据
    const fetchPageData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [appConf, bootConf, dirs] = await Promise.all([
                GetAppConfig(),
                GetBootConfig(),
                GetInitialDir()
            ]);
            setAppConfig(appConf || {});
            setBootConfig(bootConf || {});
            setDirectories(dirs || []);
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

    // 修改配置文件目录
    const handleChangeConfigDir = async () => {
        try {
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
                // if (onConfigReloadNeeded) { // 通知 App.jsx 可能需要做更多事情
                //     onConfigReloadNeeded();
                // }
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

    const handleAddDirectoryUI = async () => {
        try {
            const selectedPath = await BrowserOpenDirectory(); // <--- 修改这里
            if (selectedPath) { // 用户选择了目录，selectedPath 是目录路径字符串
                setIsUpdatingDirs(true);
                // await AddIndexedDirectory(selectedPath);
                // 重新获取数据以更新UI
                const appConf = await GetAppConfig();
                const bootConf = await GetBootConfig();
                const dirs = await GetInitialDir();
                // setAppConfig(appConf || {});
                // setBootConfig(bootConf || {});
                // setDirectories(dirs || []);
                if (onDirectoriesChanged) onDirectoriesChanged();
            } else {
                // 用户取消了选择，selectedPath 会是空字符串或 undefined/null
                console.log("User cancelled directory selection.");
            }
        } catch (err) {
            console.error("Error adding directory:", err);
        } finally {
            setIsUpdatingDirs(false);
        }
    };

    const handleRemoveDirectoryUI = async (dirToRemove) => {
        setIsUpdatingDirs(true);
        try {
            // await RemoveIndexedDirectory(dirToRemove); // 后端应保存 AppConfig
            await fetchPageData(); // 重新获取所有数据
            if (onDirectoriesChanged) onDirectoriesChanged();
        } catch (err) {
            console.error("Error removing directory:", err);
            toast.error(t("Failed to remove directory."));
        } finally {
            setIsUpdatingDirs(false);
        }
    };

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
            await onChangeLanguage(targetLanguage); // 调用 App.jsx 传递过来的函数
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
                <h2>{t('Indexed Directories')}</h2>
                {isUpdatingDirs && <p>{t('Updating directories...')}</p>}
                {!isUpdatingDirs && directories.length === 0 && (
                    <p className="no-dirs-message">{t('No directories are currently indexed.')}</p>
                )}
                <ul className="directory-list-settings">
                    {directories.map(dir => (
                        <li key={dir} className="directory-item-settings">
                            <span className="dir-path" title={dir}>{dir}</span>
                            <button
                                onClick={() => handleRemoveDirectoryUI(dir)}
                                className="remove-dir-btn"
                                disabled={isUpdatingDirs}
                                title={t('Remove directory')}
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
                <button onClick={handleAddDirectoryUI} className="add-dir-btn-settings" disabled={isUpdatingDirs}>
                    {t('Add Directory...')}
                </button>
            </section>

            <section className="settings-section">
                <h2>{t('Language')}</h2>
                <div className="language-options">
                    <button
                        onClick={() => promptChangeLanguage('en')} // 调用 prop
                        className={currentLanguage === 'en' ? 'active' : ''}
                        disabled={isLoading || isUpdatingDirs}
                    >
                        English
                    </button>
                    <button
                        onClick={() => promptChangeLanguage('zh-CN')} // 调用 prop
                        className={currentLanguage === 'zh-CN' ? 'active' : ''}
                        disabled={isLoading || isUpdatingDirs}
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
                        disabled={isLoading || isUpdatingDirs}
                    >
                        {t('Light')}
                    </button>
                    <button
                        onClick={() => onChangeTheme('dark')} // 调用 prop
                        className={currentTheme === 'dark' ? 'active' : ''}
                        disabled={isLoading || isUpdatingDirs}
                    >
                        {t('Dark')}
                    </button>
                </div>
            </section>

            <ConfirmModal
                isOpen={showLanguageConfirm}
                title={t('Confirm Language Change')}
                message={t('Are you sure you want to change the language to {{lang}}?', { lang: targetLanguage === 'en' ? 'English' : '中文' })}
                onConfirm={confirmChangeLanguage}
                onCancel={cancelChangeLanguage}
                confirmText={t('Change')}
                cancelText={t('Cancel')}
            />
        </div>
    );
}

export default SettingsPage;