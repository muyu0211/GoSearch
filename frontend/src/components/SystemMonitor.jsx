import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './SystemMonitor.css'; // 新建 CSS 文件
import { GetSystemInfo } from '../../wailsjs/go/controller/API';
import {toast} from "react-toastify"; // 调整路径
import {formatBytes} from "../assets/utils/utils.js"

const UPDATE_INTERVAL = 1000; // 每秒更新一次

function SystemMonitor({ isOpen, onClose }) {
    const { t } = useTranslation();
    const [sysInfo, setSysInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const intervalRef = useRef(null);
    const popupRef = useRef(null);

    const fetchData = async () => {
        try {
            const data = await GetSystemInfo();
            setSysInfo(data);
        } catch (error) {
            toast.error(t("Error fetching system info:", error))
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            fetchData();
            intervalRef.current = setInterval(fetchData, UPDATE_INTERVAL);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
        // 清理函数：组件卸载或 isOpen 变为 false 时清除定时器
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isOpen]); // 依赖 isOpen 状态

    // if (!isOpen) {
    //     return null; // 如果未展开，不渲染任何东西
    // }

    return (
        <div ref={popupRef} className={`system-monitor-popup ${isOpen ? 'open' : ''}`} >
            <button onClick={onClose} className="close-monitor-btn" title={t('Close')}>×</button>
            <h4>{t('System Monitor')}</h4>
            {(isLoading && isOpen) && !sysInfo ? (
                <p>{t('Loading system info')}</p>
            ) : sysInfo ? (
                <div className="sys-info-grid">
                    <div className="info-item">
                        <span className="label">{t('OS')}:</span>
                        <span className="value">{sysInfo.os} ({sysInfo.arch})</span>
                    </div>
                    <div className="info-item">
                        <span className="label">{t('CPU Cores')}:</span>
                        <span className="value">{sysInfo.cpu_cores}</span>
                    </div>

                    <div className="info-item progress-item">
                        <span className="label">{t('CPU Usage')}:</span>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar cpu-bar"
                                style={{ width: `${Math.min(100, Math.max(0, sysInfo.cpu_used_percent || 0)).toFixed(1)}%` }}
                            ></div>
                        </div>
                        <span className="value percent-value">
                            {(sysInfo.cpu_used_percent || 0).toFixed(1)}%
                        </span>
                    </div>

                    <div className="info-item progress-item">
                        <span className="label">{t('Memory Usage')}:</span>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar mem-bar"
                                style={{ width: `${Math.min(100, Math.max(0, sysInfo.mem_used_percent || 0)).toFixed(1)}%` }}
                            ></div>
                        </div>
                        <span className="value percent-value">
                            {(sysInfo.mem_used_percent || 0).toFixed(1)}%
                        </span>
                    </div>
                    <div className="info-item">
                        <span className="label">{t('Used Memory')}:</span>
                        <span className="value">{sysInfo.mem_used > 0 ? formatBytes(sysInfo.mem_used):0}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">{t('Free Memory')}:</span>
                        <span className="value">{sysInfo.mem_free > 0 ? formatBytes(sysInfo.mem_free):0}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">{t('Total Memory')}:</span>
                        <span className="value">{sysInfo.mem_all > 0 ? formatBytes(sysInfo.mem_all):0}</span>
                    </div>
                </div>
            ) : (!isLoading && isOpen) ?(
                <p>{t('Could not load system info.')}</p>
            ): null}
        </div>
    );
}

export default SystemMonitor;