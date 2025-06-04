import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import './Explorer.css';
import {GetDiskInfo, IndexDir, SearchItemFromInput} from '../../wailsjs/go/controller/DirController';
import ToolBar from "../components/ToolBar.jsx";
import {formatBytes, formatDate, getParentPath} from "../assets/utils/utils.js"
import RightClickModel from "../components/RightClickModel.jsx";

const REFRESH_INTERVAL = 10000; // 每 10 秒刷新一次

function Explorer() {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [disksInfo, setDisksInfo] = useState([]);
    const [currentPath, setCurrentPath] = useState('');
    const [historyPath, setHistoryPath] = useState([]);
    const [currentItems, setCurrentItems] = useState({ files: [], sub_dirs: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchDuration, setSearchDuration] = useState(null);
    const [viewMode, setViewMode] = useState('drives');
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
    const handleSearchFile = async (currentPath, query) => {
        setIsLoading(true);
        setViewMode('search_results'); // 切换到搜索结果视图模式
        setSearchQuery(query);
        setSearchDuration(null);
        try {
            const response = await SearchItemFromInput(query, currentPath);
            console.log("Frontend: Raw response from SearchItemFromInput:", response);

            // Wails Go 方法如果返回多个值，JS 端会收到一个对象
            // 第一个返回值在 response.Result0，第二个在 response.Result1，以此类推
            // 如果Go方法返回 (value, error)，JS端 await 会直接得到 value，错误在 catch
            // 如果Go方法返回 (value1, value2, error)，JS端 await 会得到 { Result0: value1, Result1: value2 }
            // 你需要确认 SearchItemFromInput 在 Go 中是如何绑定的，以及 Wails 如何包装多返回值

            // 假设 Wails 将 (items, duration, error) 包装为：
            // 成功: { Result0: items, Result1: duration } (error 为 nil)
            // 失败: catch(error) 会捕获 (error 不为 nil)

            // 或者，如果 SearchItemFromInput 只返回 (items, error) 并且 duration 是 items 的一部分或不返回给前端
            // 那么就是 const items = await SearchItemFromInput(query, currentSearchDir);

            // 我们先按照你给的 Go 签名 (items, duration, error) 来假设前端接收方式
            // 这通常意味着如果 Go 的 error 不为 nil，JS 的 Promise 会 reject
            // 如果 Go 的 error 为 nil，JS 的 Promise 会 resolve 一个包含前两个返回值的对象或数组

            // 让我们假设一个更常见的 Wails 行为：如果 Go 返回 (val1, val2, ..., error)
            // 前端 await 后，如果 error 为 nil，则得到 val1 (如果只有一个非 error 返回值)
            // 或得到 {Result0: val1, Result1: val2, ...} (如果有多个非 error 返回值)

            // 为了安全，我们先假设 SearchItemFromInput 的绑定行为是：
            // 如果成功，返回一个对象 { items: [], duration: 0 } (或者你后端直接返回这个结构)
            // 或者，如果 Wails 自动包装，可能是 { Result0: items, Result1: duration }

            // **你需要根据实际的 wailsjs 生成代码来确定这里的结构**
            // 让我们先假设后端API经过Wails绑定后，如果成功，前端能直接拿到 items 和 duration
            // (这可能需要你在Go端将 duration 作为 SearchResult 的一部分，或者返回一个包含两者的结构体)

            // **最可能的情况是，如果Go返回 (items, duration, error):**
            // 1. 如果 error != nil, 前端 Promise reject(error)
            // 2. 如果 error == nil, 前端 Promise resolve({Result0: items, Result1: duration})

            // 我们先按第二种情况处理，如果不对，你需要调整

            setSearchResults(response.items || []);
            setSearchDuration(response.duration_ns); // 假设 duration 是纳秒，转换为毫秒或秒显示
        } catch (error) {
            toast.error(t("Search failed: {{message}}", { message: String(error) })); // error 可能不是对象
            setSearchResults([]);
            setSearchDuration(null);
            // 可以选择回退到浏览模式
            // setViewMode(currentPath === '' ? 'drives' : 'files');
        } finally {
            setIsLoading(false);
        }
    }

    const handleDiskClick = (item) => {
        if (item.device !== "") { // 驱动器
            if (currentPath !== item.device) { // 防止重复加载同一路径
                loadData(item.device); // 加载新路径
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

    // 渲染搜索结果列表 (新的渲染函数)
    const renderSearchResultsView = () => {
        if (isLoading) {
            return <div className="explorer-loading list-loader">{t('Searching for "{{query}}"...', { query: searchQuery })}</div>;
        }
        return (
            <>
                <div className="search-results-header">
                    <h3>
                        {t('Search Results for "{{query}}" in "{{path}}"', { query: searchQuery, path: currentPath || t('All Indexed Locations') })}
                    </h3>
                    {searchDuration !== null && (
                        <span className="search-duration">
                            ({t('Found {{count}} items in {{duration}}s', { count: searchResults.length, duration: (searchDuration / 1e9).toFixed(3) })})
                        </span>
                    )}
                </div>
                {searchResults.length === 0 ? (
                    <div className="explorer-empty">{t('No items found matching your search criteria.')}</div>
                ) : (
                    <ul className="explorer-item-list search-results-list">
                        {searchResults.map((item) => (
                            <li
                                key={item.path} // 确保 item.path 是唯一的
                                onDoubleClick={() => handleItemClick(item)}
                                // onContextMenu={(e) => handleItemContextMenu(e, item)}
                                className="explorer-item"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleItemClick(item); }}
                                title={item.path} // 显示完整路径作为提示
                            >
                                <span className="item-icon">{item.is_dir ? '📁' : (item.file_type ? `.${item.file_type}` : '📄')}</span>
                                <span className="item-name">{item.name}</span>
                                <span className="item-size">{!item.is_dir && item.size > 0 ? formatBytes(item.size) : ''}</span>
                                {/* 在搜索结果中，显示完整路径可能比父路径更有用 */}
                                <span className="item-path search-result-path">{item.path}</span>
                                <span className="item-modified">{item.mod_time ? formatDate(item.mod_time) : ''}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </>
        );
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
                {viewMode === 'drives' && renderDrivesView()}
                {viewMode === 'files' && renderFileListView()}
                {viewMode === 'search_results' && renderSearchResultsView()}
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