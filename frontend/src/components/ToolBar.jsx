import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import BreadcrumbDisplay from './BreadcrumbDisplay'; // 导入面包屑组件
import './ToolBar.css';
import { GetRetrieveDes } from '../../wailsjs/go/controller/DirController';
import {toast} from "react-toastify";
import {isWindows} from "react-device-detect";

function ToolBar({ currentPath, historyPath, subDirs=[], onPathSubmit, onGoBack, onSearchFile, onRefresh }) {
    const { t } = useTranslation();
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [editablePath, setEditablePath] = useState('');
    const pathInputRef = useRef(null);
    const [isLLMSearchMode, setIsLLMSearchMode] = useState(false);

    useEffect(() => {
        if (!isEditingPath) {
            setEditablePath(currentPath || ''); // 当退出编辑或 currentPath 更新时，同步 editablePath
        }
    }, [currentPath, isEditingPath]);

    // 判断是否正在编辑
    useEffect(() => {
        if (isEditingPath && pathInputRef.current) {
            pathInputRef.current.focus();
            pathInputRef.current.select();
        }
    }, [isEditingPath]);

    const switchToEditMode = () => {
        setEditablePath(currentPath || ''); // 从当前真实路径开始编辑
        setIsEditingPath(true);
    };

    const handleEditablePathChange = (event) => {
        setEditablePath(event.target.value);
    };

    // 提交路径栏
    const handleEditablePathSubmit = async (event) => {
        event.preventDefault();
        const query = editablePath.trim();
        setIsEditingPath(false);
        if (query === "") {
            onPathSubmit(query);
            return;
        }
        // 1. 检查是否是历史路径中的完整路径
        if (historyPath && historyPath.some(path => path === query)) {
            onPathSubmit(query)
            return;
        }
        // 2. 判断是否是绝对路径
        const isWindowsAbsPath = /^[a-zA-Z]:[\/\\]/.test(query) || query.startsWith("\\\\");
        const isUnixAbsPath = query.startsWith("/");
        
        if ((isWindows && isWindowsAbsPath) || (!isWindows && isUnixAbsPath)) {
            // TODO: 用户输入绝对路径时可能是索引文件也可能是索引文件夹
            onPathSubmit(query);
            return;
        }

        // 3. 判断输入的是否是当前路径下的条目（即相对路径）
        if (subDirs && subDirs.length > 0) {
            const lowerUserInput = query.toLowerCase();
            const matchedChildDir = subDirs.find(
                dir => dir.is_dir && dir.name.toLowerCase() === lowerUserInput
            );

            if (matchedChildDir) {
                console.log("Submit: Navigating to child directory (relative):", matchedChildDir.path);
                // matchedChildDir.path 应该是该子文件夹的完整绝对路径
                // 如果 subDirs 中的 path 不是绝对路径，你需要在这里构建它
                // 例如: const fullPathToChild = buildFullPath(currentPath, matchedChildDir.name);
                onPathSubmit(matchedChildDir.path);
                return;
            }
        }

        // 4. 如果以上都不是，则视为在当前目录下进行搜索
        onSearchFile(currentPath, query, isLLMSearchMode);
    };

    const toggleLLMSearchMode = () => {
        setIsLLMSearchMode(prev => !prev);
        if (pathInputRef.current && !isEditingPath) { // 如果不在编辑模式，切换后可以自动进入编辑并聚焦
            switchToEditMode();
        } else if (pathInputRef.current && isEditingPath) {
            pathInputRef.current.focus(); // 如果已在编辑模式，确保焦点仍在输入框
        }
    };

    // 失焦时不进行提交
    const handleEditablePathBlur = async () => {
        setIsEditingPath(false);
    };

    // 监听键盘事件
    const handleEditablePathKeyDown = (event) => {
        if (event.key === 'Escape') {
            setIsEditingPath(false);
            setEditablePath(currentPath || '');
        }
        if (event.key === 'Tab') {
            // TODO: 按下tab补全
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
            // 如果 onPathSubmit 抛出错误，也应该处理一下编辑状态
            console.error("Error during path submission from breadcrumb:", error);
            // 根据你的错误处理策略，可能仍然需要退出编辑模式，或者保持编辑状态让用户修正
        } finally {
            setIsEditingPath(false);
        }
    };

    const handleCheckRetrieveDes = (event) => {
        try {
            const message = GetRetrieveDes()
        }catch (error) {
            toast.error(error)
        }
    }

    return (
        <div className="explorer-toolbar"> {/* 或者你的 toolbar-container 类名 */}
            <div className="navigation-buttons">
                <button onClick={onGoBack} disabled={currentPath === ""} title={t('Go Up')} className={"goUpBtn"}>⬆️</button>
                <button onClick={() => onPathSubmit("")} title={t('Go to My Device')} className={"goToHomeBtn"}>🏠</button> {/* Home 按钮也调用 onPathSubmit */}
            </div>

            <div className="path-input-container"> {/* 这个容器保持不变，用于边框和聚焦效果 */}
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
                            aria-label={t("Current path, editable")}
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
            {/* LLM 模式切换按钮 */}
            <button
                onClick={toggleLLMSearchMode}
                title={isLLMSearchMode ? t('Switch to Standard Search') : t('Switch to LLM Search')}
                className={`llm-toggle-btn header-action-btn ${isLLMSearchMode ? 'active' : ''}`}
            >
                🧠
            </button>
            <button onClick={handleCheckRetrieveDes} title={t('Retrieve Description')} className="retrieveDesBtn">📑</button>
            <button onClick={() => onRefresh(currentPath)} title={t('Refresh')} className="refreshBtn">🔄</button>
        </div>
    );
}

export default ToolBar;