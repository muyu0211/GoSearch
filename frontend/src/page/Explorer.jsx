import React, {useState, useEffect, useCallback, useRef} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import './Explorer.css';
import {GetDiskInfo, IndexDir, SearchItemFromInput, SearchItemFromLLM} from '../../wailsjs/go/controller/DirController';
import ToolBar from "../components/ToolBar.jsx";
import {formatBytes, formatDate, getParentPath} from "../assets/utils/utils.js"
import RightClickModel from "../components/RightClickModel.jsx";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const REFRESH_INTERVAL = 10000; // 每 10 秒刷新一次
const ITEM_HEIGHT = 43;

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
    const [rightClickModelItem, setRightClickModelItem] = useState(null);
    const [selectedItemPath, setSelectedItemPath] = useState(null);
    const contextMenuRef = useRef(null);

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

    const handleSearchFile = async (currentPath, query, isLLMSearchMode) => {
        setIsLoading(true);
        setViewMode('search_results');
        setSearchQuery(query);
        setSearchDuration(null);
        try {
            let response
            if (!isLLMSearchMode) {
                response = await SearchItemFromInput(query, currentPath);
            }else {
                response = await SearchItemFromLLM(query, currentPath)
            }

            console.log("Frontend: Raw response from SearchItemFromInput:", response);
            setSearchResults(response.items || []);
            setSearchDuration(response.duration_ns); // 假设 duration 是纳秒，转换为毫秒或秒显示
        } catch (error) {
            toast.error(t("{{message}}", { message: String(error) }));
            setSearchResults([]);
            setSearchDuration(null);
            loadData(currentPath)
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

    // 单击时选中（提供高亮提示）
    const handleItemClick = useCallback((item) => {
        console.log("Single click on:", item.name);
        setSelectedItemPath(item.path); // 更新选中项
        // TODO: 更新预览面板等
    }, []);

    const handleItemDoubleClick = useCallback(async (item) => { // 确保是 async 如果 loadData 是
        console.log("Double click on:", item);
        if (item.is_dir && item.path !== "") {
            if (currentPath !== item.path) {
                const oldPathForHistory = currentPath;
                await loadData(item.path); // loadData 内部会更新 currentPath
                if (item.path !== oldPathForHistory) {
                    setHistoryPath(prev => [...prev, oldPathForHistory]);
                }
            }
        } else if (!item.is_dir) {
            toast.info(t("Opening file: {{name}} (not yet implemented)", { name: item.name }));
            // OpenFileWithDefaultProgram(item.path);
        }
    }, [currentPath, loadData, t]); // 添加 loadData 和 t 到依赖项

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

    const renderFileListView = (itemsToRender, listType = 'files') => {
        const sortedItems = [
            ...(itemsToRender.sub_dirs || []).map(dir => ({ ...dir, is_dir_sort: 0 })),
            ...(itemsToRender.files || []).map(file => ({ ...file, is_dir_sort: 1 }))
        ].sort((a, b) => {
            if (a.is_dir_sort !== b.is_dir_sort) {
                return a.is_dir_sort - b.is_dir_sort;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

        // 如果是搜索结果，itemsToRender 直接就是扁平数组 searchResults
        let finalItemsToRender = [];
        if (listType === 'search_results') {
            finalItemsToRender = itemsToRender;
        } else {
            finalItemsToRender = sortedItems;
        }

        const FileListItem = React.memo(({ index, style, data }) => {
            const { items, selectedItemPath, t, handleItemClick, handleItemDoubleClick, handleItemRightClick, formatBytes, formatDate, getParentPath } = data;
            const item = items[index];

            if (!item) return null;

            return (
                <div style={style} className="list-row-container">
                    <li
                        onClick={() => handleItemClick(item)}
                        onDoubleClick={() => handleItemDoubleClick(item)}
                        onContextMenu={(e) => handleItemRightClick(e, item)}
                        className={`explorer-item ${selectedItemPath === item.path ? 'selected' : ''}`}
                        tabIndex={-1} // List 组件会处理可访问性，单个项通常不需要 tabIndex=0
                        title={item.path}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleItemDoubleClick(item);
                            }
                        }}
                    >
                        <span className="item-icon">{item.is_dir ? '📁' : '📄'}</span>
                        <span className="item-name" title={item.name}>{item.name}</span>
                        <span className="item-size">{!item.is_dir && item.size > 0 ? formatBytes(item.size) : (item.is_dir ? '' : '-')}</span>
                        <span className="item-path">{getParentPath(item.path)}</span>
                        <span className="item-modified">{item.mod_time ? formatDate(item.mod_time) : ''}</span>
                    </li>
                </div>
            );
        });

        const itemDataContext= {
            items: finalItemsToRender,
            selectedItemPath,
            t,
            handleItemClick,
            handleItemDoubleClick,
            handleItemRightClick,
            formatBytes,
            formatDate,
            getParentPath,
            listType
        };

        const LoadingSkeleton = () => {
            const skeletonItems = Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton-item">
                    <div className="skeleton-avatar" />
                    <div className="skeleton-content">
                        <div className="skeleton-line line-1" />
                        <div className="skeleton-line line-2" />
                    </div>
                </div>
            ));

            return (
                <div className="explorer-loading-skeleton">
                    {skeletonItems}
                    <div className="skeleton-shimmer" />
                </div>
            );
        };

        const EmptyState = ({ listType }) => (
            <div className="explorer-empty list-loader">
                <p>{listType === 'search_results' ? t('No items found matching your search criteria.') : t('This folder is empty')}</p>
                {listType === 'search_results'}
            </div>
        );

        // 加载状态
        if (isLoading) {
            return <LoadingSkeleton />
        }

        // 空状态
        if (finalItemsToRender.length === 0) {
            return <EmptyState listType={listType}/>;
        }

        return (
            <div className="file-list-view-container">
                <div className="explorer-table-header">
                    <div className="header-icon"></div>
                    <div className="header-name">{t('Name')}</div>
                    <div className="header-size">{t('Size')}</div>
                    <div className="header-type">{t('Path')}</div>
                    <div className="header-modified">{t('Modified')}</div>
                </div>
                <div className="explorer-item-list-wrapper">
                    <AutoSizer>
                        {({height, width}) => (
                            <List
                                className="explorer-item-list"
                                height={height}
                                itemCount={finalItemsToRender.length}
                                itemSize={ITEM_HEIGHT}
                                width={width}
                                itemData={itemDataContext}
                                itemKey={(index) => finalItemsToRender[index].id || index}
                            >
                                {FileListItem}
                            </List>
                        )}
                    </AutoSizer>
                </div>
            </div>
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
                {viewMode === 'files' && renderFileListView(currentItems, 'files')}
                {viewMode === 'search_results' && (
                    <>
                        <div className="search-results-header">
                            <h3>
                                {t('Search Results for \"{{query}}\" in {{path}} ', { query: searchQuery, path: currentPath || t('All Indexed Locations') })}
                            </h3>
                            {searchDuration !== null && (
                                <span className="search-duration">
                                    ({t('Found {{count}} items in {{duration}}s.', { count: searchResults.length, duration: (searchDuration / 1e9).toFixed(3) })})
                                </span>
                            )}
                        </div>
                        {renderFileListView(searchResults, 'search_results')}
                    </>
                )}
            </div>
            <RightClickModel
                ref={contextMenuRef}
                item={rightClickModelItem}
                isVisible={rightClickModelVisible}
                position={rightClickModelPosition}
                onDoubleClick={handleItemDoubleClick}
                onClose={closeContextMenu}
                loadData={loadData}
            />
        </div>
    );
}

export default Explorer;