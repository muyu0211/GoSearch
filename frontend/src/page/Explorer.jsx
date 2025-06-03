import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import './Explorer.css';
import { GetDiskInfo, IndexDir } from '../../wailsjs/go/controller/DirController';
import ToolBar from "../components/ToolBar.jsx";
import {formatBytes, formatDate, getParentPath} from "../assets/utils/utils.js"
import RightClickModel from "../components/RightClickModel.jsx";

const REFRESH_INTERVAL = 10000; // 每 10 秒刷新一次

function Explorer() {
    const { t } = useTranslation();
    const [currentPath, setCurrentPath] = useState(''); // 空路径表示顶级磁盘视图
    const [historyPath, setHistoryPath] = useState([]);
    const [currentItems, setCurrentItems] = useState({ files: [], sub_dirs: [] });
    const [disksInfo, setDisksInfo] = useState([]); // 用于顶级驱动器
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('drives'); // 'drives' 或 'files'
    // --- ContextMenu 相关的 State ---
    const [rightClickModelVisible, setRightClickModelVisible] = useState(false);
    const [rightClickModelPosition, setRightClickModelPosition] = useState({ x: 0, y: 0 });
    const [rightClickModelItem, setRightClickModelItem] = useState(null); // 当前右键点击的项目

    // 加载数据的主要函数(接收参数：文件夹绝对路径path)
    const loadData = useCallback(async (path, useCache=true) => {
        setIsLoading(true);
        try {
            if (!path || path === '/') { // 根路径或空路径视为顶级磁盘视图
                const drivesData = await GetDiskInfo();
                setDisksInfo(drivesData || []);
                setCurrentItems({ files: [], sub_dirs: [] }); // 清空文件列表
                setCurrentPath(''); // 确保当前路径为空
                setHistoryPath([]); // 回到顶级时清空历史
                setViewMode('drives');
            } else {
                const dirContent = await IndexDir(path, useCache);
                const filesArray = dirContent.files ? Object.values(dirContent.files) : [];
                const subDirsArray = dirContent.sub_dirs ? Object.values(dirContent.sub_dirs) : [];
                if (dirContent) {
                    setCurrentItems({
                        files: filesArray,
                        sub_dirs: subDirsArray,
                    });
                    setCurrentPath(dirContent.path || path);
                    setDisksInfo([]);
                    setViewMode('files');
                } else {
                    toast.error(t("Could not load directory content."));
                    setCurrentItems({ files: [], sub_dirs: [] });
                }
            }
        } catch (error) {
            toast.error(t("Error loading data: {{message}}", { message: error.message || String(error) }));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    const loadDataNoCache =  useCallback(async (path) => {
        await loadData(path, false)
    },[t]);

    // 组件首次加载时，加载顶级驱动器
    useEffect(() => {
        loadData('');
    }, [loadData]);

    // TODO: 处理输入框检索文件
    const handleSearchFile = async (currentPath, targetItemName) => {
        console.log("curr:", currentPath)
        console.log("newPath:", targetItemName)
        await SearchItemFromInput(targetItemName, currentPath)
    }

    const handleDiskClick = (item) => {
        if (item.device !== "") { // 驱动器
            if (currentPath !== item.device) { // 防止重复加载同一路径
                loadData(item.device); // 加载新路径
                // setHistoryPath(prev => [...prev, currentPath]); // 将当前路径加入历史
            }
        } else { // 文件
            toast.info("Disk preview/action not yet implemented.");
        }
    }

    const handleItemClick = (item) => {
        if (item.is_dir && item.path !== "") {
            if (currentPath !== item.path) {
                loadData(item.path);
                // 加载新路径时因为文件夹不存在或者权限不足等问题而没有进入下一级目录时不更新pathHistory
                if (currentPath !== historyPath[historyPath.length -1]) {
                    setHistoryPath(prev => [...prev, currentPath]);
                }
            }
        } else if (!item.is_dir) {
            // TODO: 双击打开
            toast.info("This is a file.");
        }
    };

    const handleItemRightClick = (event, item) => {
        event.preventDefault(); // 阻止浏览器默认右键菜单
        setRightClickModelItem(item);
        setRightClickModelPosition({ x: event.clientX, y: event.clientY });
        setRightClickModelVisible(true);
    }

    const closeContextMenu = () => {
        setRightClickModelVisible(false);
        setRightClickModelItem(null);
    };

    const navigateBack = () => {
        if (historyPath.length > 0) {
            // 获取上一级路径
            const previousPath = historyPath[historyPath.length - 1];
            setHistoryPath(prevHistory => prevHistory.slice(0, -1));
            loadData(previousPath); // 加载上一级路径（可能是空字符串，会触发顶级视图）
        } else if (viewMode === 'files') {
            loadData('');
        }
    };

    const renderDrivesView = () => (
        <div className="disk-explorer-container">
            <h3 className="disk-explorer-title">{t('Drives and Devices')}</h3>
            {isLoading && disksInfo.length === 0 ? (
                <div className="explorer-loading full-page-loader">{t('Loading drives')}</div>
            ) : disksInfo.length === 0 ? (
                <div className="explorer-empty">{t('No drives found or accessible.')}</div>
            ) : (
                <div className="disk-grid">
                    {disksInfo.map((drive) => (
                        <div
                            key={drive.device}
                            className="disk-card"
                            onClick={() => handleDiskClick(drive)}
                            title={`${drive.device} - ${drive.type}\n${t('Click to explore')}`}
                        >
                            <div className="disk-card-header">
                                <span className="disk-icon">🖴</span>
                                <span className="disk-name">{drive.name} ({drive.device.replace(/\\$/, '')})</span>
                            </div>
                            {drive.used && drive.total > 0 && (
                                <>
                                    <div className="disk-pie-chart-container">
                                        <div
                                            className="disk-pie-chart"
                                            style={{
                                                background: `conic-gradient(
                                                    var(--settings-accent-color) 0% ${drive.used_percent?.toFixed(1) || 0}%,
                                                    var(--bg-tertiary, #e9ecef) ${drive.used_percent?.toFixed(1) || 0}% 100%
                                                )`,
                                            }}
                                            data-percent={`${drive.used_percent?.toFixed(1) || 0}%`}
                                        ></div>
                                    </div>
                                    <div className="disk-info">
                                        <p className="disk-usage-text">
                                            {formatBytes(drive.free)} {t('free of')} {formatBytes(drive.total)}
                                        </p>
                                        <div className="disk-progress-bar-container">
                                            <div
                                                className="disk-progress-bar"
                                                style={{ width: `${drive.used_percent?.toFixed(1) || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </>
                            )}
                            {(!drive.used || drive.total === 0) && (
                                <div className="disk-info">
                                    <p>{t('Usage information not available')}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderFileListView = () => {
        const items = [...(currentItems.sub_dirs || []), ...(currentItems.files || [])];
        return (
            <>
                <div className="explorer-table-header">
                    <div className="header-icon"> {/* 文件夹/文件图标 */} </div>
                    <div className="header-name">{t('Name')}</div>
                    <div className="header-size">{t('Size')}</div>
                    <div className="header-type">{t('Path')}</div>
                    <div className="header-modified">{t('Modified')}</div>
                </div>
                {isLoading && items.length === 0 ? (
                    <div className="explorer-loading list-loader">{t('Loading')}</div>
                ) : (
                    <ul className="explorer-item-list">
                        {items.map((item) => (
                            <li
                                key={item.path}
                                onDoubleClick={() => handleItemClick(item)}
                                onContextMenu={(e) => handleItemRightClick(e, item)}
                                className="explorer-item"
                                tabIndex={0}    // 可以添加 tabIndex 使其可被键盘聚焦，并用 onKeyDown 处理 Enter 键作为进入
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleItemClick(item); // Enter 键也视为双击进入
                                    }
                                }}
                            >
                                <span className="item-icon">{item.is_dir ? '📁' : '📄'}</span>
                                <span className="item-name">{item.name}</span>
                                <span className="item-size">{!item.is_dir && item.size > 0 ? formatBytes(item.size) : ''}</span>
                                <span className="item-path">{getParentPath(item.path)}</span>
                                {/*<span className="item-type">{item.is_dir ? t('Folder') : t('File')}</span>*/}
                                <span className="item-modified">{!item.is_dir && item.mod_time ? formatDate(item.mod_time) : ''}</span>
                            </li>
                        ))}
                        {items.length === 0 && !isLoading && (
                            <li className="explorer-empty">{t('This folder is empty')}</li>
                        )}
                    </ul>
                )}
            </>
        );
    };

    return (
        <div className="file-explorer-page-container">
            <div className="file-explorer-container">
                <ToolBar
                    currentPath={currentPath}
                    historyPath={historyPath}
                    subDirs={currentItems.sub_dirs}
                    onPathSubmit={loadData}
                    onGoBack={navigateBack}
                    onSearchFile={handleSearchFile}
                    onRefresh={loadDataNoCache}
                />
                {viewMode === 'drives' ? renderDrivesView() : renderFileListView()}
            </div>
            <RightClickModel
                item={rightClickModelItem}
                isVisible={rightClickModelVisible}
                position={rightClickModelPosition}
                onDoubleClick={handleItemClick}
                onClose={closeContextMenu}
                loadData={loadData}
            />
        </div>
    );
}

export default Explorer;