import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import BreadcrumbDisplay from './BreadcrumbDisplay'; // 导入面包屑组件
import './ToolBar.css';
import { GetRetrieveDes } from '../../wailsjs/go/controller/DirController';
import {toast} from "react-toastify";
import {isWindows} from "react-device-detect";

function ToolBar({ currentPath, historyPath, onPathSubmit, onGoBack, onSearchFile, onRefresh }) {
    const { t } = useTranslation();
    const [isEditingPath, setIsEditingPath] = useState(false);      // 是否正在编辑
    const [editablePath, setEditablePath] = useState('');            // 修改后的内容
    const pathInputRef = useRef(null);

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
        const newPath = editablePath.trim();
        setIsEditingPath(false);
        if (newPath === "") {
            onPathSubmit(newPath);
            return;
        }
        // 1. 检查是否是历史路径中的完整路径
        if (historyPath && historyPath.some(path => path === newPath)) {
            onPathSubmit(newPath)
            return;
        }
        // 2. 判断是否是绝对路径
        const isWindowsAbsPath = /^[a-zA-Z]:[\/\\]/.test(newPath) || newPath.startsWith("\\\\");
        const isUnixAbsPath = newPath.startsWith("/");
        if ((isWindows && isWindowsAbsPath) || (!isWindows && isUnixAbsPath)) {
            // TODO: 用户输入绝对路径时可能是索引文件也可能是索引文件夹
            onPathSubmit(newPath);
            return;
        }
        // 4. 如果以上都不是，则视为在当前目录下进行搜索
        onSearchFile(currentPath, newPath);
    };

    // 失焦时不进行提交
    const handleEditablePathBlur = async () => {
        setIsEditingPath(false);
        // const newPath = editablePath.trim();
        // // 只有当编辑框内容与当前路径不同时才提交
        // if (newPath !== (currentPath || '')) {
        //     if (newPath || currentPath || currentPath === "") {
        //         try {
        //             await onPathSubmit(newPath);
        //         } catch (error) {
        //             console.error("Error submitting path on blur:", error);
        //         } finally {
        //             setIsEditingPath(false);
        //         }
        //     } else { // newPath 为空，且 currentPath 也为空或未定义
        //         setIsEditingPath(false);
        //     }
        // } else { // 内容未变，直接退出编辑
        //     setIsEditingPath(false);
        // }
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
            // TODO:考虑删除pathHistory中前面的路径
            console.log(historyPath)
        } catch (error) {
            // 如果 onPathSubmit 抛出错误，也应该处理一下编辑状态
            console.error("Error during path submission from breadcrumb:", error);
            // 根据你的错误处理策略，可能仍然需要退出编辑模式，或者保持编辑状态让用户修正
        } finally {
            setIsEditingPath(false);
        }
    };

    // TODO: 查看检索说明
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
                        onNavigateToPath={handleNavigateFromBreadcrumb} // 面包屑项点击导航
                        onEditPath={switchToEditMode} // 点击面包屑容器进入编辑模式
                    />
                )}
            </div>
            <button onClick={handleCheckRetrieveDes} title={t('Retrieve Description')} className="retrieveDesBtn">📑</button>
            <button onClick={() => onRefresh(currentPath)} title={t('Refresh')} className="refreshBtn">🔄</button>
        </div>
    );
}

export default ToolBar;