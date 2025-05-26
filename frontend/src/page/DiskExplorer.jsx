// frontend/src/components/DiskExplorer.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import './DiskExplorer.css'; // 新建 CSS 文件
import { GetDiskInfo } from '../../wailsjs/go/controller/DirController'; // 确保路径正确

const REFRESH_INTERVAL = 10000; // 每 10 秒刷新一次

function DiskExplorer({ onDiskSelect }) { // onDiskSelect 用于处理点击磁盘的事件
    const { t } = useTranslation();
    const [disks, setDisks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const intervalRef = useRef(null);

    const fetchDiskData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setIsLoading(true);
        try {
            const diskData = await GetDiskInfo();
            setDisks(diskData || []);
        } catch (error) {
            console.error("Error fetching disk info:", error);
            toast.error(t("Could not load disk information."));
            setDisks([]); // 出错时清空
        } finally {
            if (isInitialLoad) setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchDiskData(true); // 初始加载

        intervalRef.current = setInterval(() => {
            fetchDiskData(false); // 定期刷新，不显示全局 loading
        }, REFRESH_INTERVAL);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchDiskData]);

    const handleDiskSelected = (disk) => {
        // 用户点击了某个磁盘
        // TODO: 实现导航到下一级目录的逻辑
        // 例如，可以将 currentPage 设置为一个新的 'fileExplorer' 状态，
        // 并将 disk.path 作为参数传递给 FileExplorer 组件
        toast.info(t('Exploring {{diskPath}} (feature coming soon!)', { diskPath: disk.path }));
        // 示例：如果想直接将这个磁盘作为索引目录添加
        // const confirmAdd = window.confirm(t('Do you want to add "{{disk}}" to be indexed?', { disk: disk.name || disk.path }));
        // if (confirmAdd) {
        //     // 调用 AddIndexedDirectory(disk.path)
        //     // 然后重新 fetchInitialData()
        // }
    };

    if (isLoading) {
        return <div className="disk-explorer-loading">{t('Loading disk information')}</div>;
    }

    if (disks.length === 0) {
        return <div className="disk-explorer-empty">{t('No disks found or unable to retrieve disk information')}</div>;
    }

    return (
        <div className="disk-explorer-container">
            <h3 className="disk-explorer-title">{t('Drives and Devices')}</h3>
            <div className="disk-grid">
                {disks.map((disk) => (
                    <div
                        key={disk.device || disk.mount_point} // device 通常是唯一标识
                        className="disk-card"
                        onClick={() => handleDiskSelected(disk)} // 传递整个 disk 对象
                        title={`${disk.device} - ${disk.fs_type}\n${t('Click to explore')}`}
                    >
                        <div className="disk-card-header">
                            <span className="disk-icon">🖴</span> {/* 简单图标 */}
                            <span className="disk-name">{disk.device} ({disk.mount_point.replace(/\\$/, '')})</span>
                        </div>
                        <div className="disk-pie-chart-container">
                            {/* 简易 CSS 饼图 */}
                            <div
                                className="disk-pie-chart"
                                style={{
                                    // conic-gradient for pie chart effect
                                    background: `conic-gradient(
                                        var(--settings-accent-color) 0% ${disk.used_percent.toFixed(1)}%,
                                        var(--bg-tertiary, #e9ecef) ${disk.used_percent.toFixed(1)}% 100%
                                    )`,
                                    '--used-percent': `${disk.used_percent.toFixed(1)}%` // 用于动画或伪元素显示
                                }}
                                data-percent={`${disk.used_percent.toFixed(1)}%`} // 用于 data-* 属性显示
                            >
                                {/* 可以选择在中间显示百分比 */}
                                {/* <span className="pie-chart-text">{`${disk.used_percent.toFixed(1)}%`}</span> */}
                            </div>
                        </div>
                        <div className="disk-info">
                            <p className="disk-usage-text">
                                {disk.free} MB {t('free of')} {disk.total} MB
                            </p>
                            <div className="disk-progress-bar-container">
                                <div
                                    className="disk-progress-bar"
                                    style={{ width: `${disk.used_percent.toFixed(1)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default DiskExplorer;