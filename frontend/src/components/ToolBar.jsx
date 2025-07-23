import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import BreadcrumbDisplay from './BreadcrumbDisplay';
import './ToolBar.css';
import { GetRetrieveDes } from '../../wailsjs/go/controller/DirController'; // 假设这是同步的
import { toast } from "react-toastify";
import { isWindows } from "react-device-detect"; // 确保这个库按预期工作或有替代方案
import FilterTag from './FilterTag'; // 引入新组件

// 辅助函数判断是否为绝对路径
const isAbsolutePath = (path) => {
    if (typeof path !== 'string') return false;
    const isWinAbs = /^[a-zA-Z]:[/\\]/.test(path) || path.startsWith("\\\\");
    const isUnixAbs = path.startsWith("/");
    return (isWindows && isWinAbs) || (!isWindows && isUnixAbs); // isWindows 来自 react-device-detect
};

// --- 完全重构后的查询构建器组件 ---
const QueryBuilder = ({ onAddFilter, onClose, builderRef }) => {
    const { t } = useTranslation();

    // State for each filter type
    const [type, setType] = useState('');
    const [size, setSize] = useState(10);
    const [unit, setUnit] = useState('MB');
    const [operator, setOperator] = useState('>');

    // --- 新增：日期选择器的内部状态 ---
    const [isDateSectionOpen, setIsDateSectionOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleAddType = (e) => {
        e.preventDefault();
        if (type.trim()) {
            onAddFilter({ type: 'file_type', value: type.trim() });
            setType('');
            // onClose();
        }
    };

    const handleAddSize = (e) => {
        e.preventDefault();
        if (size > 0) {
            onAddFilter({ type: 'file_size', operator, value: size, unit });
            // onClose();
        }
    };

    const handleApplyDateFilter = () => {
        if (!startDate && !endDate) return;
        onAddFilter({ type: 'file_date', startDate, endDate });
        setIsDateSectionOpen(false);
        onClose();
    };

    return (
        <div className="query-builder-dropdown" ref={builderRef}>
            {/* --- 文件类型筛选 --- */}
            <div className="builder-section">
                <label>{t('File Type')}</label>
                <form onSubmit={handleAddType} className="builder-input-group">
                    <input type="text" value={type} onChange={(e) => setType(e.target.value)} placeholder={'e.g., pdf, docx'} className="builder-input" />
                    <button type="submit" className="builder-add-btn">+</button>
                </form>
            </div>

            {/* --- 文件大小筛选 --- */}
            <div className="builder-section">
                <label>{t('File Size')}</label>
                <form onSubmit={handleAddSize} className="builder-input-group">
                    <select value={operator} onChange={(e) => setOperator(e.target.value)} className="builder-select size-operator">
                        <option value=">">＞</option>
                        <option value="<">＜</option>
                        <option value="=">=</option>
                    </select>
                    <input type="number" value={size} min="0"
                           onChange={(e) => setSize(parseFloat(e.target.value) || 0)}
                           className="builder-input size-value" />
                    <select value={unit} onChange={(e) => setUnit(e.target.value)} className="builder-select size-unit">
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                        <option value="GB">GB</option>
                    </select>
                    <button type="submit" className="builder-add-btn">+</button>
                </form>
            </div>

            <div className="builder-separator"></div>

            {/* --- 日期筛选（可展开/折叠） --- */}
            <div className="builder-section">
                <button className={`builder-date-toggle-btn ${isDateSectionOpen ? 'open' : ''}`} onClick={() => setIsDateSectionOpen(p => !p)}>
                    <span role="img" aria-label="calendar icon">📅</span>
                    <span>{t('Filter by date')}</span>
                    <span className="chevron">›</span>
                </button>
                <div className={`builder-date-section ${isDateSectionOpen ? 'open' : ''}`}>
                    <div className="date-inputs-container">
                        <div className="date-input-group">
                            <label htmlFor="startDateInput">{t('From')}</label>
                            <input id="startDateInput" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate || ''} className="date-input" />
                        </div>
                        <div className="date-input-group">
                            <label htmlFor="endDateInput">{t('To')}</label>
                            <input id="endDateInput" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || ''} className="date-input" />
                        </div>
                    </div>
                    <button className="date-apply-btn" onClick={handleApplyDateFilter}>{t('Apply Date Filter')}</button>
                </div>
            </div>
        </div>
    );
};

function ToolBar({ currentPath, historyPath = [], subDirs = [], onPathSubmit, onGoBack, onSearchFile, onRefresh }) {
    const { t } = useTranslation();
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [editablePath, setEditablePath] = useState('');
    const pathInputRef = useRef(null);
    const [isLLMSearch, setIsLLMSearch] = useState(false);

    // --- 用于可视化查询构建器 ---
    const [filters, setFilters] = useState([]);
    const [showQueryBuilder, setShowQueryBuilder] = useState(false);
    const queryBuilderRef = useRef(null);

    // 如果当前路径导航到了顶级磁盘，则清空过滤器
    useEffect(()=> {
        if(currentPath === "") {
            setFilters([])
        }
    },[currentPath])

    // 同步 editablePath 当 currentPath 改变或退出编辑模式时
    // useEffect(() => {
    //     if (!isEditingPath) {
    //         setEditablePath(currentPath || '');
    //     }
    // }, [currentPath, isEditingPath]);

    // 聚焦并全选输入框当进入编辑模式
    useEffect(() => {
        if (isEditingPath && pathInputRef.current) {
            pathInputRef.current.focus();
            pathInputRef.current.select();
        }
    }, [isEditingPath]);

    // 点击外部关闭弹窗
    useEffect(() => {
        function handleClickOutside(event) {
            if (queryBuilderRef.current && !queryBuilderRef.current.contains(event.target) && !event.target.closest('.add-filter-btn')) {
                setShowQueryBuilder(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const switchToEditMode = () => {
        setEditablePath(currentPath || '');
        setIsEditingPath(true);
    };

    // --- 将筛选条件转换为搜索字符串 ---
    const buildSearchQuery = (mainTerm) => {
        const filterParts = filters.map(f => {
            switch (f.type) {
                case 'file_type': return `type:${f.value}`;
                case 'file_size': return `size:${f.operator}${f.value}${f.unit}`;
                case 'file_date':
                    const start = f.startDate ? `date:>=${new Date(f.startDate).toISOString().split('T')[0]}` : '';
                    const end = f.endDate ? `date:<=${new Date(f.endDate).toISOString().split('T')[0]}` : '';
                    return `${start} ${end}`.trim();
                default: return '';
            }
        });
        return [mainTerm, ...filterParts].join(' ').trim();
    };

    const handleSubmitLogic = async (query) => {
        const fullQuery = buildSearchQuery(query);
        // 如果只有筛选条件而没有主搜索词，且不在编辑模式，直接触发搜索
        if (!query && fullQuery) {
            await onSearchFile(fullQuery, isLLMSearch);
            return;
        }

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
        await onSearchFile(fullQuery, isLLMSearch, { startDate, endDate });
    };

    // 添加过滤器
    const handleAddFilter = (filter) => {
        console.log(filters)
        const filterWithId = { ...filter, id: Date.now() };
        switch (filter.type) {
            case 'file_date':
                setFilters(prevFilters => [
                    ...prevFilters.filter(f => f.type !== 'file_date'),
                    filterWithId
                ]);
                break;

            case 'file_type': {
                const isDuplicate = filters.some(
                    f => f.type === 'file_type' && f.value.toLowerCase() === filterWithId.value.toLowerCase()
                );
                if (isDuplicate) {
                    toast.info(t('filter.alreadyExists', `筛选条件 "type: {{value}}" 已存在。`, { value: filterWithId.value }));
                    return;
                }
                setFilters(prevFilters => [...prevFilters, filterWithId]);
                break;
            }

            case 'file_size': {
                const isDuplicate = filters.some(
                    f =>
                        f.type === 'file_size' &&
                        f.operator === filterWithId.operator &&
                        f.value === filterWithId.value &&
                        f.unit === filterWithId.unit
                );
                if (isDuplicate) {
                    toast.info(t('filter.alreadyExists', `筛选条件 "{{operator}}{{value}}{{unit}}" 已存在。`, {
                        operator: filterWithId.operator,
                        value: filterWithId.value,
                        unit: filterWithId.unit
                    }));
                    return;
                }
                setFilters(prevFilters => [...prevFilters, filterWithId]);
                break;
            }

            default:
                setFilters(prevFilters => [...prevFilters, filterWithId]);
                break;
        }
    };

    // 移除过滤器
    const handleRemoveFilter = (id) => {
        setFilters(prev => prev.filter(f => f.id !== id));
    };

    // // 提交按钮现在也需要考虑筛选器
    // useEffect(() => {
    //     // 当筛选器变化时，如果输入框为空，自动触发一次搜索
    //     const term = editablePath.trim();
    //     if (!term && filters.length > 0 && !isEditingPath) {
    //         handleSubmitLogic('');
    //     }
    // }, [filters]);

    // 按下提交按钮进行搜索
    const handleEditablePathSubmit = async (event) => {
        event.preventDefault();
        const query = editablePath.trim();
        setIsEditingPath(false);
        await handleSubmitLogic(query);
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

    // const toggleLLMSearchMode = () => {
    //     setIsLLMSearch(prev => !prev);
    //     // if (pathInputRef.current && !isEditingPath) {       // 如果不在编辑模式，切换后可以自动进入编辑并聚焦
    //     //     switchToEditMode();
    //     // } else if (pathInputRef.current && isEditingPath) {
    //     //     pathInputRef.current.focus();                   // 如果已在编辑模式，确保焦点仍在输入框
    //     // }
    // };

    // 查看检索说明
    // const handleCheckRetrieveDes = async () => {
    //     try {
    //         const message = await GetRetrieveDes(); // 调用并等待
    //     } catch (error) {
    //         toast.error(String(error));
    //     }
    // };

    // // 日期筛选逻辑
    // const handleDateChange = () => {
    //     if (!startDate && !endDate) return;
    //     // 移除旧的日期筛选器
    //     const otherFilters = filters.filter(f => f.type !== 'date');
    //     const newDateFilter = { id: Date.now(), type: 'date', startDate, endDate };
    //     setFilters([...otherFilters, newDateFilter]);
    //     setShowDatePicker(false);
    // };
    //
    // const clearDateFilter = () => {
    //     setStartDate(null);
    //     setEndDate(null);
    //     setFilters(prev => prev.filter(f => f.type !== 'date'));
    //     setShowDatePicker(false);
    // };
    // const toggleDatePicker = () => {
    //     setShowDatePicker(prev => !prev);
    // };
    //
    // const handleStartDateChange = (event) => {
    //     const date = event.target.value ? new Date(event.target.value) : null;
    //     setStartDate(date);
    // };
    //
    // const handleEndDateChange = (event) => {
    //     const date = event.target.value ? new Date(event.target.value) : null;
    //     setEndDate(date);
    // };
    //
    // const clearDatesAndSearch = () => {
    //     setStartDate(null);
    //     setEndDate(null);
    //     if (editablePath.trim() && !isAbsolutePath(editablePath.trim())) {
    //         onSearchFile(editablePath.trim(), isLLMSearch, { startDate: null, endDate: null });
    //     } else {
    //         onPathSubmit(currentPath);
    //     }
    //     setShowDatePicker(false);
    // };

    return (
        <div>
            <div className="explorer-toolbar">
                {/* ... 导航按钮 ... */}
                <div className="navigation-buttons">
                    <button onClick={onGoBack} disabled={currentPath === "" && historyPath.length === 0} title={t('Go Up')} className={"goUpBtn"}>⬆️</button>
                    <button onClick={() => onPathSubmit("")} title={t('Go to My Device')} className={"goToHomeBtn"}>🏠</button>
                </div>

                <div className="path-and-filters-container">
                    <div className="path-input-container">
                        {isEditingPath ? (
                            <form onSubmit={handleEditablePathSubmit} className="path-edit-form">
                                <input ref={pathInputRef} type="text" value={editablePath} onChange={(e) => setEditablePath(e.target.value)} onBlur={() => setIsEditingPath(false)} className="path-input-field" placeholder={currentPath || t('Type path or search term...')} />
                            </form>
                        ) : (
                            <BreadcrumbDisplay
                                currentPath={currentPath}
                                onNavigateToPath={handleNavigateFromBreadcrumb}
                                onEditPath={switchToEditMode}
                            /> )}
                        <button className="add-filter-btn" onClick={() => setShowQueryBuilder(p => !p)} title={t('Add search filter')}>+</button>
                        {showQueryBuilder && <QueryBuilder builderRef={queryBuilderRef} onAddFilter={handleAddFilter} onClose={() => setShowQueryBuilder(false)} />}
                    </div>
                </div>

                {/* ... 其他操作按钮 ... */}
                <button onClick={() =>{setIsLLMSearch(p=>!p)}} title={isLLMSearch ? t('Switch to Standard Search') : t('Switch to LLM Search')} className={`llm-toggle-btn header-action-btn ${isLLMSearch ? 'active' : ''}`}>🧠</button>
                {/*<button onClick={GetRetrieveDes} title={t('Retrieve Description')} className="retrieveDesBtn header-action-btn">📑</button>*/}
                <button onClick={() => onRefresh()} title={t('Refresh')} className="refreshBtn header-action-btn">🔄</button>
            </div>

            {filters.length > 0 && (
                <div className="active-filters-area">
                    {filters.map(filter => (
                        <FilterTag key={filter.id} filter={filter} onRemove={handleRemoveFilter} />
                    ))}
                </div>
            )}
        </div>

    );
}

export default ToolBar;