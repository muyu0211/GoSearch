import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import './Explorer.css';
import ToolBar from "../components/ToolBar.jsx";
import RightClickModel from "../components/RightClickModel.jsx";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { formatBytes, formatDate, getParentPath } from "../assets/utils/utils.js";
// 导入自定义 Hooks
import { useNavigation } from '../hooks/useNavigation';
import { useSearch } from '../hooks/useSearch';
import FileIcon from "../components/FileIcon.jsx";
import { OpenFile } from "../../wailsjs/go/controller/FileController"
import PreviewModal from "../components/PreviewModel.jsx";

const ITEM_HEIGHT = 40;

function Explorer(callback, deps) {
    const { t } = useTranslation();
    const { currentPath,
            historyPath,
            currentItems ,
            disksInfo,
            isLoading: isLoadingNavigation,
            viewMode,
            setViewMode,
            loadData,
            navigateToPath,
            navigateBack,
            refreshCurrentView,
            setCurrentItems,
            // setCurrentPath,
    } = useNavigation();
    const { isLoading,
            searchQuery,
            searchResults,
            searchDuration,
            searchDateRange,
            triggerSearch,
            // stopCurrentSearchStream,
    } = useSearch(currentPath, setViewMode, setCurrentItems);

    const [rightClickModelVisible, setRightClickModelVisible] = useState(false);
    const [rightClickModelPosition, setRightClickModelPosition] = useState({ x: 0, y: 0 });
    const [rightClickModelItem, setRightClickModelItem] = useState(null);
    const [selectedItemPath, setSelectedItemPath] = useState(null); // 用于高亮选中项

    // --- PreviewModal 相关的 State ---
    const [showPreview, setShowPreview] = useState(false);
    const [previewItem, setPreviewItem] = useState(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const hoverTimeoutRef = useRef(null);

    // 组件首次加载
    useEffect(() => {
        loadData('');
    }, [loadData])

    // --- 事件处理器 ---
    const handleDiskClick = useCallback((item) => {
        if (item.device && item.device !== currentPath) {
            navigateToPath(item.device);
        }
    }, [currentPath, navigateToPath]);

    const handleItemClick = useCallback((item) => { // 单击选中
        setSelectedItemPath(item.path);
        // TODO: 更新预览面板等
    }, []);

    const handleItemDoubleClick = useCallback(async (item) => {
        if (item.is_dir && item.path && item.path !== currentPath) {
            await navigateToPath(item.path);
        } else if (!item.is_dir) {
            // toast.info(t("Opening file: {{name}} (not yet implemented)", { name: item.name }));
            try {
                await OpenFile(item.path);
            }catch (error){
                toast.error(error)
            }
        }
    }, [currentPath, navigateToPath, t]);

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

    const handleItemMouseEnter = useCallback((event, item) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        // 如果预览已经显示，并且是针对同一个项目，则不执行任何操作
        if (showPreview && previewItem && previewItem.path === item.path) {
            return;
        }
        // 设置一个短暂的延迟后显示预览，避免鼠标快速划过时频繁触发
        hoverTimeoutRef.current = setTimeout(() => {
            setPreviewItem(item);
            setPreviewPosition({ x: event.clientX, y: event.clientY });
            setShowPreview(true);
        }, 700);

    }, [showPreview, previewItem]);

    const handleItemMouseLeave = useCallback(() => {
        // 当鼠标离开列表项时，清除计时器，并隐藏预览
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        // 鼠标移开立即隐藏
        setShowPreview(false);
    }, []);

    // ====================================== 渲染逻辑 ======================================
    const FileListItem = React.memo(({ index, style, data }) => {
        const { items, selectedItemPath, t, handleItemClick, handleItemDoubleClick, handleItemRightClick,
                formatBytes, formatDate, getParentPath, handleItemMouseEnter, handleItemMouseLeave } = data;
        const item = items[index];

        if (!item) return null;

        return (
            <div style={style} className="list-row-container">
                <li
                    onClick={() => handleItemClick(item)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    onContextMenu={(e) => handleItemRightClick(e, item)}
                    onMouseEnter={(e) => handleItemMouseEnter(e, item)}
                    onMouseLeave={handleItemMouseLeave}
                    className={`explorer-item ${selectedItemPath === item.path ? 'selected' : ''}`}
                    tabIndex={-1}
                    // title={item.path}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleItemDoubleClick(item);
                        }
                    }}
                >
                    {/*<span className="item-icon">{item.is_dir ? '📁' : '📄'}</span>*/}
                    <span className="item-icon">
                        <FileIcon fileName={item.name} isDir={item.is_dir}/>
                    </span>
                    <span className="item-name">{item.name}</span>
                    <span
                        className="item-size">{!item.is_dir && item.size > 0 ? formatBytes(item.size) : (item.is_dir ? '' : '-')}</span>
                    <span className="item-path">{getParentPath(item.path)}</span>
                    <span className="item-modified">{item.mod_time ? formatDate(item.mod_time) : ''}</span>
                </li>
            </div>
        );
    });

    const LoadingSkeleton = () => {
        const skeletonItems = Array.from({length: 5}).map((_, index) => (
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

    const renderDrivesView = () => (
        <div className="disk-explorer-container">
            <h3 className="disk-explorer-title">{t('Drives and Devices')}</h3>
            {isLoading && disksInfo.length === 0 ? (
                <div className="explorer-loading full-page-loader">{t('Loading drives')}</div>
            ) : disksInfo.length === 0 ? (
                <div className="explorer-empty">{t('No disks found or unable to retrieve disk information')}</div>
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

        const itemDataContext = {
            items: finalItemsToRender, selectedItemPath, t,
            handleItemClick, handleItemDoubleClick, handleItemRightClick,
            formatBytes, formatDate, getParentPath, listType,
            handleItemMouseEnter, handleItemMouseLeave // <--- 将新的事件处理器传递给 FileListItem
        };

        if (isLoadingNavigation && listType === 'files' && finalItemsToRender.length === 0) return <LoadingSkeleton />;
        if (isLoading && listType === 'search_results' && finalItemsToRender.length === 0) return <LoadingSkeleton />;
        if (finalItemsToRender.length === 0 && !isLoadingNavigation && !isLoading) return <EmptyState listType={listType} />;

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
                                itemKey={(index, data) => data.items[index].path || index}
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
                    subDirs={(viewMode === 'files' || viewMode === 'search_results') ? [...(currentItems.sub_dirs || [])] : []}
                    onGoBack={navigateBack}
                    onRefresh={refreshCurrentView}
                    onPathSubmit={navigateToPath}
                    onSearchFile={triggerSearch}
                />
                {viewMode === 'drives' && renderDrivesView()}
                {viewMode === 'files' && renderFileListView(currentItems, 'files')}
                {viewMode === 'search_results' && (
                    <>
                        <div className="search-results-header">
                            <h3>
                                {t('Search Results for "{{query}}" in {{path}} ', { query: searchQuery, path: currentPath || t('All Indexed Locations') })}
                                {(searchDateRange.startDate || searchDateRange.endDate) && (
                                    <span className="date-filter-info">
                                        {searchDateRange.startDate && searchDateRange.endDate ? (
                                            t('(filtered by date: from {{startDate}} to {{endDate}})', {
                                                startDate: searchDateRange.startDate.toLocaleDateString(),
                                                endDate: searchDateRange.endDate.toLocaleDateString()
                                            })
                                        ) : searchDateRange.startDate ? (
                                            t('(filtered by date: after {{date}})', { date: searchDateRange.startDate.toLocaleDateString() })
                                        ) : (
                                            t('(filtered by date: before {{date}})', { date: searchDateRange.endDate.toLocaleDateString() })
                                        )}
                                    </span>
                                )}
                            </h3>
                            {searchDuration !== null && !isLoading && (
                                <span className="search-duration">
                                    ({t('Found {{count}} items in {{duration}}s.', {
                                    count: searchResults.length,
                                    duration: searchDuration.toFixed(3)
                                })})
                                </span>
                            )}
                            {isLoading && searchResults.length > 0 && (
                                <span className="search-duration"> ({t('Loading')})</span>
                            )}
                        </div>
                        {renderFileListView(searchResults, 'search_results')}
                    </>
                )}
            </div>
            <RightClickModel
                item={rightClickModelItem}
                isVisible={rightClickModelVisible}
                position={rightClickModelPosition}
                onDoubleClick={handleItemDoubleClick}
                onClose={closeContextMenu}
                loadData={refreshCurrentView}
            />
            <PreviewModal
                isOpen={showPreview}
                item={previewItem}
                position={previewPosition}
                // onClose={() => setShowPreview(false)} // 通常悬停预览不需要内部关闭按钮
            />
        </div>
    );
}

export default Explorer;