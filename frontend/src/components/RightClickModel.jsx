import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import { useTranslation } from 'react-i18next';
import './RightClickModel.css';
import {toast} from "react-toastify";
import RenameModal from "./RenameModal.jsx";
import {getParentPath} from "../assets/utils/utils.js";
import ConfirmModal from "./ConfirmModal.jsx";
import {DeleteItem} from "../../wailsjs/go/controller/DirController.js";

const RightClickModel = React.forwardRef(({  item, isVisible, position, onDoubleClick, onClose, loadData }, ref) => {
    const { t } = useTranslation();
    const menuRef = useRef(null);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [itemToRename, setItemToRename] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [calculatedPosition, setCalculatedPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (typeof ref === 'function') {
            ref(menuRef.current);
        } else if (ref) {
            ref.current = menuRef.current;
        }
    }, [ref]);

    // 使用 useLayoutEffect 来在 DOM 更新后、浏览器绘制前计算位置，避免闪烁
    useLayoutEffect(() => {
        if (isVisible && menuRef.current && position) {
            const menu = menuRef.current;
            const menuRect = menu.getBoundingClientRect();
            const menuWidth = menuRect.width;
            const menuHeight = menuRect.height;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newLeft = position.x;
            let newTop = position.y;

            // 调整水平位置
            if (position.x + menuWidth > viewportWidth) {
                newLeft = viewportWidth - menuWidth - 7; // 7px margin from edge
            }
            if (newLeft < 7) { // 防止完全移出左边
                newLeft = 7;
            }
            // 调整垂直位置
            if (position.y + menuHeight > viewportHeight) {
                newTop = viewportHeight - menuHeight - 7; // 7px margin from edge
            }
            if (newTop < 7) { // 防止完全移出顶部
                newTop = 7;
            }
            setCalculatedPosition({ top: newTop, left: newLeft });
        }
    }, [isVisible, position, item]);

    // 点击菜单外部时关闭菜单
    useEffect(() => {
        if (!isVisible) {
            setShowRenameModal(false);
            setItemToRename(null);
            setShowDeleteConfirm(false);
            return;
        }

        // 当 RightClickModel 变为可见时，重置内部模态框状态
        setShowRenameModal(false);
        setItemToRename(null);
        setShowDeleteConfirm(false);

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisible, onClose]);

    if (!isVisible || !item) {
        return null;
    }

    // 处理上下文菜单中的操作
    const handleContextMenuAction = async (actionType, item) => {
        switch (actionType) {
            case 'create_dir':
                toast.info('新建文件夹');
                break;
            case 'create_file':
                toast.info('新建文件')
                break;
            case 'open':
                onDoubleClick(item);
                onClose();
                break;
            case 'copy_path':
                try {
                    await navigator.clipboard.writeText(item.path);
                    toast.success(t('Path copied to clipboard!'));
                } catch (copyErr) {
                    toast.error(t('Failed to copy path.'));
                } finally {
                    onClose();
                }
                break;
            case 'open_file_location':
                // TODO: 打开文件所在位置
                toast.info("open file location is not yet implement")
                break
            case 'copy_file':
                toast.info(t('Copy file "{{name}}" (not yet implemented)', { name: item.name }));
                // TODO: 实现复制文件逻辑 (可能需要后端支持，或前端模拟剪贴板)
                break;
            case 'rename':
                setItemToRename(item);
                setShowRenameModal(true);
                break;
            case 'delete':
                setShowDeleteConfirm(true)
                break;
            case 'properties':
                toast.info(t('Properties for "{{name}}" (not yet implemented)', { name: item.name }));
                // TODO: 显示文件/文件夹属性对话框 (可能需要新的模态框和后端 API)
                onClose();
                break;
            default:
                toast.error("Unknown context menu action:", actionType);
        }
    };

    const confirmDeleteItem = async () => {
        console.log(item)
        try {
            await DeleteItem(item.path)
            await loadData(getParentPath(item.path))
            toast.success(t("Delete successfully!"))
        } catch (error) {
            toast.error(error)
        } finally {
            setShowDeleteConfirm(false);
            onClose();
        }
    };

    const cancelDeleteItem = () => {
        setShowDeleteConfirm(false);
        onClose();
    };

    const menuItems = [];
    if (!item) {
        menuItems.push({ label: t('Create Dir'), action: 'create_dir' });
        menuItems.push({ label: t('Create File'), action: 'create_file' });
    } else if (item.is_dir) {
        menuItems.push({ label: t('Open'), action: 'open' });
        menuItems.push({ label: t('Copy Path'), action: 'copy_path' });
        menuItems.push({ label: t('Rename'), action: 'rename' });
        menuItems.push({ label: t('Delete'), action: 'delete' });
        // ... 其他文件夹操作
    } else {
        menuItems.push({ label: t('Open'), action: 'open' });
        menuItems.push({ label: t('Copy Path'), action: 'copy_path' });
        menuItems.push({ label: t('Copy File'), action: 'copy_file' });
        menuItems.push({ label: t('Rename'), action: 'rename' });
        menuItems.push({ label: t('Delete'), action: 'delete' });
        // ... 其他文件操作
    }
    menuItems.push({ label: t('Open the file location'), action: 'open_file_location'})
    menuItems.push({ label: t('Properties'), action: 'properties' });

    return (
        <>
            <div
                ref={menuRef}
                className="context-menu"
                style={{ top: calculatedPosition.top, left: calculatedPosition.left, opacity: isVisible ? 1 : 0 }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <ul>
                    {menuItems.map((menuItem) => (
                        <li key={menuItem.action} onClick={() => handleContextMenuAction(menuItem.action, item)}>
                            {menuItem.label}
                        </li>
                    ))}
                </ul>
            </div>
            {itemToRename && (
                <RenameModal
                    isOpen={showRenameModal}
                    item={itemToRename}
                    onClose={() => {
                        setShowRenameModal(false);
                        setItemToRename(null);
                    }}
                    onRightModelClose={onClose}
                    loadData={loadData}
                />
            )}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title={t('Confirm Delete')}
                message={t('Are you sure you want to delete this {{itemName}}?', { itemName: item.name })}
                onConfirm={confirmDeleteItem}
                onCancel={cancelDeleteItem}
                confirmText={t('Delete')}
                cancelText={t('Cancel')}
            />
        </>
    )
});

export default RightClickModel;