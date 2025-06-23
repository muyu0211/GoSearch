// frontend/src/components/BreadcrumbDisplay.jsx
import React from 'react';
import {isWindows} from 'react-device-detect';
import { useTranslation } from 'react-i18next';
import './BreadcrumbDisplay.css';

function BreadcrumbDisplay({ currentPath, onNavigateToPath, onEditPath }) {
    const { t } = useTranslation();
    const parts = currentPath.split(/[\/\\]/).filter(part => part !== '');
    const segment = isWindows ? '\\' : '/'

    if (!currentPath || currentPath === '') {
        return (
            <div className="breadcrumb-container" onClick={onEditPath} title={t("Click to edit path")}>
                <ol className="breadcrumb-list">
                    <li className="breadcrumb-item">
                        <span className="breadcrumb-current" aria-current="page">
                            {t("My Computer")}
                        </span>
                    </li>
                </ol>
            </div>
        );
    }

    // 点击路径栏中的路径
    const handleBreadcrumbClick = (index) => {
        let pathToNavigate;
        if (isWindows) {
            pathToNavigate = parts.slice(0, index + 1).join(segment);
            // 确保盘符后有斜杠，例如 C:\ 而不是 C:
            // if (index === 0 && !pathToNavigate.endsWith(segment)) {
            //     pathToNavigate += segment;
            // }
        } else {
            // 对于类 Unix 路径，确保以 / 开头
            pathToNavigate = segment + parts.slice(0, index + 1).join(segment);
        }
        onNavigateToPath(pathToNavigate);
    };

    return (
        <div className="breadcrumb-container" onClick={onEditPath} title={t("Click to edit path")}>
            <ol className="breadcrumb-list">
                {parts.map((part, index) => (
                    <React.Fragment key={index}>
                        <li className="breadcrumb-item">
                            <button onClick={() => handleBreadcrumbClick(index)} className="breadcrumb-link">
                                {part + segment}
                            </button>
                        </li>
                    </React.Fragment>
                ))}
            </ol>
        </div>
    );
}

export default BreadcrumbDisplay;