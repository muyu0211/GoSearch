import React from 'react';
import { useTranslation } from 'react-i18next';
import './FilterTag.css'; // 我们将为此创建CSS

function FilterTag({ filter, onRemove }) {
    const { t } = useTranslation();

    // 根据筛选类型生成可读的文本
    const getFilterText = () => {
        switch (filter.type) {
            case 'file_type':
                return `${t('filter.type')}: ${filter.value}`;
            case 'file_size':
                return `${t('filter.size')}: ${filter.operator} ${filter.value}${filter.unit}`;
            case 'file_date':
                const start = filter.startDate ? new Date(filter.startDate).toLocaleDateString() : '...';
                const end = filter.endDate ? new Date(filter.endDate).toLocaleDateString() : '...';
                if (filter.startDate && filter.endDate) return `${start} → ${end}`;
                if (filter.startDate) return `${t('From')} ${start}`;
                if (filter.endDate) return `${t('To')} ${end}`;
                return t('filter.date.invalid');
            default:
                return 'Unknown Filter';
        }
    };

    return (
        <div className="filter-tag" title={getFilterText()}>
            <span className="filter-tag-text">{getFilterText()}</span>
            <button
                className="filter-tag-remove"
                onClick={() => onRemove(filter.id)}
                title={t('filter.remove')}
            >
                ×
            </button>
        </div>
    );
}

export default FilterTag;