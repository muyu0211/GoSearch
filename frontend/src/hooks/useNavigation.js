// frontend/src/hooks/useNavigation.js
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { GetDiskInfo, IndexDir } from '../../wailsjs/go/controller/DirController'; // 调整路径

export function useNavigation() {
    const { t } = useTranslation();
    const [currentPath, setCurrentPath] = useState('');
    const [historyPath, setHistoryPath] = useState([]);
    const [currentItems, setCurrentItems] = useState({ files: [], sub_dirs: [] });
    const [disksInfo, setDisksInfo] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('drives'); // 'drives', 'files', 'search_results'

    // 加载数据
    const loadData = useCallback(async (path, useCache = true) => {
        setIsLoading(true);
        try {
            // 回到顶级页面
            if (!path || path === '/') {
                const drivesData = await GetDiskInfo();
                setDisksInfo(drivesData || []);
                setCurrentItems({ files: [], sub_dirs: [] });
                setCurrentPath('');
                setHistoryPath([]); // 回到顶级时清空历史
                setViewMode('drives');
            } else {
                const dirContent = await IndexDir(path, useCache); // 假设 IndexDir 返回规范化路径
                if (dirContent && dirContent.path !== undefined) { // 确保后端返回了内容
                    const filesArray = dirContent.files ? Object.values(dirContent.files) : [];
                    const subDirsArray = dirContent.sub_dirs ? Object.values(dirContent.sub_dirs) : [];
                    setCurrentItems({ files: filesArray, sub_dirs: subDirsArray });
                    setCurrentPath(dirContent.path);
                    setDisksInfo([]);
                    setViewMode('files');
                } else {
                    toast.error(t("Could not load directory content for: {{path}}", { path }));
                    // 保持当前路径和视图，或回退，或显示错误视图
                    // setCurrentItems({ files: [], sub_dirs: [] });
                }
            }
        } catch (error) {
            toast.error(t("Error loading data: {{message}}", { message: error.message || String(error) }));
            return error
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    // 导航至指定路径
    const navigateToPath = useCallback(async (newPath) => {
        if (currentPath === newPath) { // 如果新路径等于当前路径则刷新
            await refreshCurrentView()
            return;
        }
        if (currentPath !== undefined) {
            const err = await loadData(newPath);
            if (!historyPath.includes(newPath) && err == null) {
                setHistoryPath(prev => [...prev, currentPath]);
            }
        }
    }, [currentPath, loadData]);

    // 返回上一级
    const navigateBack = useCallback(async () => {
        if (historyPath.length > 0) {
            const previousPath = historyPath[historyPath.length - 1];
            setHistoryPath(prevHistory => prevHistory.slice(0, -1));
            await navigateToPath(previousPath);
        } else if (viewMode === 'files' || viewMode === 'search_results') {
            await navigateToPath("");
        }
    }, [historyPath, viewMode, navigateToPath]);

    // 刷新页面
    const refreshCurrentView = useCallback(async () => {
        if (viewMode === 'drives') {
            await loadData('', false);
        } else if (currentPath) {
            await loadData(currentPath, false);
        }
    }, [currentPath, viewMode, loadData, t]);

    return {
        currentPath,
        historyPath,
        currentItems,
        disksInfo,
        isLoading,
        viewMode,
        setViewMode,
        loadData,
        navigateToPath,
        navigateBack,
        refreshCurrentView,
        setCurrentItems,
    };
}