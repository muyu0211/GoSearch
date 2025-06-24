import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import BreadcrumbDisplay from './BreadcrumbDisplay';
import './ToolBar.css';
import { GetRetrieveDes } from '../../wailsjs/go/controller/DirController'; // 假设这是同步的
import { toast } from "react-toastify";
import { isWindows } from "react-device-detect"; // 确保这个库按预期工作或有替代方案

// 辅助函数判断是否为绝对路径
const isAbsolutePath = (path) => {
    if (typeof path !== 'string') return false;
    const isWinAbs = /^[a-zA-Z]:[/\\]/.test(path) || path.startsWith("\\\\");
    const isUnixAbs = path.startsWith("/");
    return (isWindows && isWinAbs) || (!isWindows && isUnixAbs); // isWindows 来自 react-device-detect
};

function ToolBar({ currentPath, historyPath = [], subDirs = [], onPathSubmit, onGoBack, onSearchFile, onRefresh }) {
    const { t } = useTranslation();
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [editablePath, setEditablePath] = useState('');
    const pathInputRef = useRef(null);
    const [isLLMSearch, setIsLLMSearch] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const datePickerRef = useRef(null); // 用于日期选择器的外部点击关闭

    // 同步 editablePath 当 currentPath 改变或退出编辑模式时
    useEffect(() => {
        if (!isEditingPath) {
            setEditablePath(currentPath || '');
        }
    }, [currentPath, isEditingPath]);

    // 聚焦并全选输入框当进入编辑模式
    useEffect(() => {
        if (isEditingPath && pathInputRef.current) {
            pathInputRef.current.focus();
            pathInputRef.current.select();
        }
    }, [isEditingPath]);

    // 点击外部关闭日期选择器
    useEffect(() => {
        function handleClickOutside(event) {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target) &&
                !event.target.closest('.date-picker-btn')) { // 确保点击的不是打开按钮本身
                setShowDatePicker(false);
            }
        }
        if (showDatePicker) { // 只在日期选择器打开时监听
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDatePicker]); // 依赖 showDatePicker

    const switchToEditMode = () => {
        setEditablePath(currentPath || '');
        setIsEditingPath(true);
    };

    const handleEditablePathChange = (event) => {
        setEditablePath(event.target.value);
    };

    const handleSubmitLogic = async (query) => {
        // 1. 空查询导航到根
        if (query === "") {
            await onPathSubmit("");
            return;
        }

        // 2. 是否为绝对路径导航
        if (isAbsolutePath(query)) {
            await onPathSubmit(query);
            return;
        }

        // 3. 是否为历史记录中的完整路径 (精确匹配)
        if (historyPath.some(path => path === query)) {
            await onPathSubmit(query);
            return;
        }

        // 4. 是否为当前子目录的精确名称 (导航)
        if (subDirs.length > 0) {
            const lowerQuery = query.toLowerCase();
            const matchedChildDir = subDirs.find(dir => dir.is_dir && dir.name.toLowerCase() === lowerQuery);
            if (matchedChildDir) {
                // 确保 matchedChildDir.path 是绝对路径
                // 如果不是，需要构建: const fullPath = currentPath + (isWindows ? '\\' : '/') + matchedChildDir.name;
                await onPathSubmit(matchedChildDir.path); // 假设 matchedChildDir.path 是绝对路径
                // clearDatesAndSearch(); // 同上
                return;
            }
        }
        // 5. 否则，视为在当前目录下进行搜索
        await onSearchFile(query, isLLMSearch, { startDate, endDate });
    };

    const handleEditablePathSubmit = async (event) => {
        event.preventDefault();
        const query = editablePath.trim();
        setIsEditingPath(false);
        await handleSubmitLogic(query);
    };

    const toggleLLMSearchMode = () => {
        setIsLLMSearch(prev => !prev);
        if (pathInputRef.current && !isEditingPath) {       // 如果不在编辑模式，切换后可以自动进入编辑并聚焦
            switchToEditMode();
        } else if (pathInputRef.current && isEditingPath) {
            pathInputRef.current.focus();                   // 如果已在编辑模式，确保焦点仍在输入框
        }
    };

    // 失焦时不进行提交
    const handleEditablePathBlur = async () => {
        setIsEditingPath(false);
    };

    const handleEditablePathKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            setIsEditingPath(false);
            setEditablePath(currentPath || '');
        }
        // Tab 补全逻辑 (TODO)
        if (event.key === 'Tab') {
            event.preventDefault(); // 阻止默认 Tab 行为
            // TODO: 实现 Tab 补全逻辑，使用 subDirs (只包含文件夹)
            console.log("Tab pressed, current input:", editablePath, "Sub-folders:", subDirs.filter(i => i.is_dir));
        }
    };

    // 当面包屑中的某一项被点击时，直接导航
    const handleNavigateFromBreadcrumb = async (newPath) => {
        try {
            await onPathSubmit(newPath);
            const index = historyPath.indexOf(newPath);
            if (index >= 0) {
                historyPath.splice(index);
            }
        } catch (error) {
            // 如果 onPathSubmit 抛出错误，处理一下编辑状态
        } finally {
            setIsEditingPath(false);
        }
    };

    // 查看检索说明
    const handleCheckRetrieveDes = async () => {
        try {
            const message = await GetRetrieveDes(); // 调用并等待
        } catch (error) {
            toast.error(String(error));
        }
    };

    const toggleDatePicker = () => {
        setShowDatePicker(prev => !prev);
    };

    const handleStartDateChange = (event) => {
        const date = event.target.value ? new Date(event.target.value) : null;
        setStartDate(date);
    };

    const handleEndDateChange = (event) => {
        const date = event.target.value ? new Date(event.target.value) : null;
        setEndDate(date);
    };

    const clearDatesAndSearch = () => {
        setStartDate(null);
        setEndDate(null);
        if (editablePath.trim() && !isAbsolutePath(editablePath.trim())) {
            onSearchFile(editablePath.trim(), isLLMSearch, { startDate: null, endDate: null });
        } else {
            onPathSubmit(currentPath);
        }
        setShowDatePicker(false);
    };

    return (
        <div className="explorer-toolbar">
            <div className="navigation-buttons">
                <button onClick={onGoBack} disabled={currentPath === "" && historyPath.length === 0} title={t('Go Up')}
                        className={"goUpBtn"}>⬆️
                </button>
                <button onClick={() => onPathSubmit("")} title={t('Go to My Device')} className={"goToHomeBtn"}>🏠
                </button>
            </div>

            <div className="path-input-container">
                {isEditingPath ? (
                    <form onSubmit={handleEditablePathSubmit} className="path-edit-form">
                        <input
                            ref={pathInputRef}
                            type="text"
                            value={editablePath}
                            onChange={handleEditablePathChange}
                            onBlur={handleEditablePathBlur}
                            onKeyDown={handleEditablePathKeyDown}
                            className="path-input-field"
                            placeholder={currentPath || t('Type path or search term...')}
                            aria-label={t("Current path, editable")}
                            autoComplete="off"
                        />
                    </form>
                ) : (
                    <BreadcrumbDisplay
                        currentPath={currentPath}
                        onNavigateToPath={handleNavigateFromBreadcrumb}
                        onEditPath={switchToEditMode}
                    />
                )}
            </div>
                <div className="date-picker-container" ref={datePickerRef}>
                    <button
                        onClick={toggleDatePicker}
                        title={(startDate || endDate) ? t('(filtered by date: from {{start}} to {{end}})', {
                            start: startDate ? startDate.toLocaleDateString() : 'any',
                            end: endDate ? endDate.toLocaleDateString() : 'any'
                        }) : t('Add date filter')}
                        className={`date-picker-btn ${(startDate || endDate) ? 'active' : ''}`}
                    >
                        📅
                    </button>
                        <div
                            className={`date-picker-dropdown ${showDatePicker ? 'open' : 'closed'}`}> {/* 移除动态类，直接用 showDatePicker 控制 */}
                            <div className="date-picker-header">
                                <span>{t('Select Date Range')}</span>
                                {(startDate || endDate) && (
                                    <button onClick={clearDatesAndSearch} className="clear-date-btn"
                                            title={t('Clear Dates')}>
                                        ×
                                    </button>
                                )}
                            </div>
                            <div className="date-inputs-container">
                                <div className="date-input-group">
                                    <label htmlFor="startDateInput">{t('From')}</label>
                                    <input
                                        id="startDateInput"
                                        type="date"
                                        onChange={handleStartDateChange}
                                        value={startDate ? startDate.toISOString().split('T')[0] : ''}
                                        className="date-input"
                                        max={endDate ? endDate.toISOString().split('T')[0] : ''}
                                    />
                                </div>
                                <div className="date-input-group">
                                    <label htmlFor="endDateInput">{t('To')}</label>
                                    <input
                                        id="endDateInput"
                                        type="date"
                                        onChange={handleEndDateChange}
                                        value={endDate ? endDate.toISOString().split('T')[0] : ''}
                                        className="date-input"
                                        min={startDate ? startDate.toISOString().split('T')[0] : ''}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
            <button
                onClick={toggleLLMSearchMode}
                title={isLLMSearch ? t('Switch to Standard Search') : t('Switch to LLM Search')}
                className={`llm-toggle-btn header-action-btn ${isLLMSearch ? 'active' : ''}`}
            >
                🧠
            </button>
            <button onClick={handleCheckRetrieveDes} title={t('Retrieve Description')}
                    className="retrieveDesBtn header-action-btn">📑
            </button>
            <button onClick={() => onRefresh(currentPath)} title={t('Refresh')}
                    className="refreshBtn header-action-btn">🔄
            </button>
        </div>
    );
}

export default ToolBar;