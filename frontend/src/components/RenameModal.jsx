import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './RenameModal.css';
import {toast} from "react-toastify";
import {getParentPath} from "../assets/utils/utils.js";
import {RenameItem} from '../../wailsjs/go/controller/DirController';

function RenameModal({ isOpen, item, onClose, onRightModelClose, loadData }) {
    const { t } = useTranslation();
    const [newName, setNewName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setNewName(item.name || '');
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 0);
        }
    }, [isOpen]);

    // 处理实际的重命名操作
    const handleRenameItem = async (item, newName) => {
        if (!item || !item.path || !newName) return;
        try {
            await RenameItem(item.path, newName); // <--- 调用后端 API
            toast.success(t('Renamed successfully!'));
            await loadData(getParentPath(item.path));
        } catch (renameError) {
            toast.error("Rename failed in Explorer:", renameError);
            throw renameError;
        }
    };

    const handleNameChange = (event) => {
        setNewName(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmedNewName = newName.trim();
        onRightModelClose()
        onClose();

        if (!trimmedNewName) {
            return;
        }
        if (trimmedNewName === item.name) {
            toast("新旧名称不能一样")
            return;
        }
        // 可以在这里添加更复杂的名称验证逻辑 (例如，不允许特殊字符)

        setIsRenaming(true);
        try {
            await handleRenameItem(item, trimmedNewName);
            // 成功后，父组件应该负责关闭模态框和刷新列表
        } catch (renameError) {
            toast.error("Rename failed:", renameError);
        } finally {
            setIsRenaming(false);
        }
    };

    if (!isOpen || !item) {
        onRightModelClose()
        return null;
    }

    return (
        <div className="rename-modal-overlay"  onMouseDown={(e) => e.stopPropagation()} >
            <form onSubmit={handleSubmit} className="rename-modal-content">
                <h3 className="rename-modal-title">{t('Rename')}</h3>
                <p className="rename-modal-current-name">
                    {t('Current name')}: <strong>{item.name}</strong>
                </p>
                <div className="rename-input-group">
                    <label htmlFor="newNameInput" className="rename-label">{t('New name')}:</label>
                    <input
                        ref={inputRef}
                        type="text"
                        id="newNameInput"
                        value={newName}
                        onChange={handleNameChange}
                        className={"rename-input-field"}
                        disabled={isRenaming}
                        aria-describedby="renameError"
                    />
                </div>
                <div className="rename-modal-actions">
                    <button type="button" onClick={onClose} className="rename-modal-btn cancel" disabled={isRenaming}>
                        {t('Cancel')}
                    </button>
                    <button type="submit" className="rename-modal-btn confirm" disabled={isRenaming || !newName.trim()}>
                        {isRenaming ? t('Renaming') : t('Rename')}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default RenameModal;