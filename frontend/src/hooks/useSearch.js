import {useState, useCallback, useRef, useEffect} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import {
    SearchItemFromInput,
    SearchItemFromInputInStream,
    SearchItemFromLLMInStream
} from '../../wailsjs/go/controller/DirController';

export function useSearch(currentPath, setViewModeExternal, setCurrentItems) {
    const { t, i18n } = useTranslation();
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchDuration, setSearchDuration] = useState(null);
    const [searchDateRange, setSearchDateRange] = useState({ startDate: null, endDate: null });
    const searchStartTimeRef = useRef(null);
    const currentEventHandlerRef = useRef(null);
    const stopCurrentStreamRef = useRef(null);

    useEffect(() => {
        return () => {
            if (stopCurrentStreamRef.current) {
                stopCurrentStreamRef.current();
            }
        };
    }, []);

    const cleanupStream = useCallback(() => {
        if (searchStartTimeRef.current) {
            const endTime = performance.now();
            setSearchDuration((endTime - searchStartTimeRef.current) / 1000);
            searchStartTimeRef.current = null;
        }
        setIsLoadingSearch(false);
    }, []);

    const executeSearchStream = useCallback(async (query, isLLMSearchMode, dateRange) => {
        if (stopCurrentStreamRef.current) {
            stopCurrentStreamRef.current();
        }
        if (currentEventHandlerRef.current && !stopCurrentStreamRef.current) {
            EventsOff("search_stream", currentEventHandlerRef.current);
            currentEventHandlerRef.current = null;
        }
        stopCurrentStreamRef.current = null; // 确保旧的 stop function ref 被清除

        setViewModeExternal('search_results');
        setIsLoadingSearch(true);
        setSearchQuery(query);
        setSearchResults([]);
        setSearchDuration(null);
        setSearchDateRange(dateRange || { startDate: null, endDate: null });
        searchStartTimeRef.current = performance.now();

        let cnt = 0

        const searchParams = {
            query,
            current_path: currentPath,
            modified_after: "",
            modified_before: "",
        };
        if (dateRange) {
            if (dateRange.startDate) searchParams.modified_after = new Date(Date.UTC(new Date(dateRange.startDate).getFullYear(),new Date(dateRange.startDate).getMonth(),new Date(dateRange.startDate).getDate(),0,0,0)).toISOString();
            if (dateRange.endDate) searchParams.modified_before = new Date(Date.UTC(new Date(dateRange.endDate).getFullYear(),new Date(dateRange.endDate).getMonth(),new Date(dateRange.endDate).getDate(),23,59,59)).toISOString();
        }

        const eventHandler = (item) => {
            if (item === null || item === undefined) {
                console.log("流接受了:", cnt)
                if (stopCurrentStreamRef.current === stopThisStream) {
                    stopCurrentStreamRef.current();
                }
                return;
            }
            if (item && typeof item === 'object') {
                const feItem = {
                    name: item.name || 'Unknown Name', path: item.path || 'Unknown Path',
                    is_dir: typeof item.is_dir === 'boolean' ? item.is_dir : false,
                    size: typeof item.size === 'number' ? item.size : 0,
                    mod_time: item.mod_time || new Date().toISOString(),
                    file_type: item.file_type || '',
                };
                setSearchResults(prev => [...prev, feItem]);
                cnt ++
            }
        };

        const stopThisStream = () => {
            EventsOff("search_stream", eventHandler);
            if (currentEventHandlerRef.current === eventHandler) {
                currentEventHandlerRef.current = null;
            }
            cleanupStream();
            // TODO: Call backend to stop stream if supported
        };

        // 挂载监听器
        EventsOn("search_stream", eventHandler);
        currentEventHandlerRef.current = eventHandler;
        stopCurrentStreamRef.current = stopThisStream;

        try {
            if (isLLMSearchMode) {
                await SearchItemFromLLMInStream(searchParams);
            }else {
                await SearchItemFromInputInStream(searchParams);
            }
        } catch (error) {
            toast.error(t("Failed to start search: {{message}}", { message: error.message || String(error) }));
            cleanupStream();
            stopCurrentStreamRef.current = null;
        }
    }, [t, i18n, cleanupStream, currentPath, setViewModeExternal, setIsLoadingSearch, setSearchQuery, setSearchResults, setSearchDuration, setSearchDateRange]);

    const executeSearchNoStream = async (query, isLLMSearchMode, dateRange) => {
        setIsLoadingSearch(true);
        setViewModeExternal('search_results');
        setSearchQuery(query);
        setSearchResults([]);
        setSearchDuration(null);
        setSearchDateRange(dateRange || { startDate: null, endDate: null });
        searchStartTimeRef.current = performance.now();

        const searchParams = {
            query,
            current_path: currentPath, // 使用导航的当前路径作为搜索基础
            modified_after: "",
            modified_before: "",
        };
        if (dateRange) {
            if (dateRange.startDate) searchParams.modified_after = new Date(Date.UTC(new Date(dateRange.startDate).getFullYear(),new Date(dateRange.startDate).getMonth(),new Date(dateRange.startDate).getDate(),0,0,0)).toISOString();
            if (dateRange.endDate) searchParams.modified_before = new Date(Date.UTC(new Date(dateRange.endDate).getFullYear(),new Date(dateRange.endDate).getMonth(),new Date(dateRange.endDate).getDate(),23,59,59)).toISOString();
        }

        try {
            let response;
            if (isLLMSearchMode) {
                // response = await SearchItemFromLLM(searchParams);
                toast.warn("LLM Search not implemented for non-stream");
                setIsLoadingSearch(false); return;
            } else {
                response = await SearchItemFromInput(searchParams);
            }
            setSearchResults(response.items || []);
            if (searchStartTimeRef.current) {
                const endTime = performance.now();
                setSearchDuration((endTime - searchStartTimeRef.current) / 1000);
                searchStartTimeRef.current = null;
            }
        } catch (error) {}
        finally { setIsLoadingSearch(false); }
    };

    // 返回一个统一的搜索触发函数
    const triggerSearch = useCallback((searchQuery, isLLMSearch = false, dateRangeFilter = null) => {
        executeSearchStream(searchQuery, isLLMSearch, dateRangeFilter);
    }, [executeSearchStream]);

    return {
        isLoading: isLoadingSearch,
        searchQuery,
        searchResults,
        searchDuration,
        searchDateRange,
        triggerSearch,
        stopCurrentSearchStream: stopCurrentStreamRef.current,
    };
}