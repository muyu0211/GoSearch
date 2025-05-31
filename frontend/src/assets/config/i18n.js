// frontend/src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
// TODO: 导入翻译文件
// import translationEN from './locales/en/translation.json';
// import translationZH from './locales/zh/translation.json';

// 你的翻译资源
const resources = {
    // en: {
    //     translation: translationEN
    // },
    // zh: {
    //     translation: translationZH
    // }
    en: {
        translation: {
            "GoSearch": "GoSearch",
            "AppName": "AppName",
            "Version": "Version",
            "Welcome to GoSearch!": "Welcome to GoSearch!",
            "Settings": "Settings",
            "Go to Home": "Go to Home",
            "Back to Home": "Back to Home",
            "Loading": "Loading",
            "Loading settings...": "Loading settings...",
            "Search files placeholder": "Search files (e.g., 'report.docx' or 'images from last week > 1MB')",
            "To get started, please add some directories to index in the settings.": "To get started, please add some directories to index in the settings.",
            "Go to Settings": "Go to Settings",
            "Type in the search bar above to find your files.": "Type in the search bar above to find your files.",
            "Currently indexing your files... Please wait.": "Currently indexing your files... Please wait.",
            "About GoSearch": "About GoSearch",
            "GoSearch is a blazing fast local file search and preview tool, built with Go and React.": "GoSearch is a blazing fast local file search and preview tool, built with Go and React.",
            "It aims to provide a seamless and efficient way to find your files instantly.": "It aims to provide a seamless and efficient way to find your files instantly.",
            "Indexed Directories": "Indexed Directories",
            "Loading directories...": "Loading directories...",
            "No directories are currently indexed.": "No directories are currently indexed.",
            "Remove directory": "Remove directory",
            "Add Directory...": "Add Directory...",
            "Change Directory": "Change Directory",
            "Language": "Language",
            "Theme": "Theme",
            "Light": "Light",
            "Dark": "Dark",
            "Theme Changed successfully!": "Theme Changed successfully!",
            "Could not load directories.": "Could not load directories.",
            "Failed to add directory. Ensure it's a valid path and not already indexed.": "Failed to add directory. Ensure it's a valid path and not already indexed.",
            "Failed to remove directory.": "Failed to remove directory.",
            "Data and Configuration Directory": "Data and Configuration Directory",
            "Current data & config directory": "Current data & config directory",
            "Changing this directory will move where GoSearch stores its main configuration (like theme, language) and all its data (like file indexes). This might require an app restart and data re-indexing if not migrated automatically.":
                "Changing this directory will move where GoSearch stores its main configuration (like theme, language) and all its data (like file indexes). This might require an app restart and data re-indexing if not migrated automatically.",
            "Could not load settings data.": "Could not load settings data.",
            "Error saving language preference:": "Error saving language preference:",
            "Failed to save language preference.": "Failed to save language preference.",

            "Confirm Action": "Confirm Action",
            "You are already using this language.": "You are already using this language.",
            "Confirm Language Change": "Confirm Language Change",
            "Are you sure you want to proceed?": "Are you sure you want to proceed?",
            "Are you sure you want to change the language to {{lang}}?": "Are you sure you want to change the language to {{lang}}?",
            "Change": "Change",
            "Cancel": "Cancel",
            "Changing": "Changing",
            "Language Changed successfully!": "Language Changed successfully!",

            "The selected directory is the same as the current one.": "The selected directory is the same as the current one.",
            "Data and configuration directory changed successfully! An application restart may be required for all changes to take full effect.":
                "Data and configuration directory changed successfully! An application restart may be required for all changes to take full effect.",
            "Failed to change data directory. Ensure the new path is valid and writable.": "Failed to change data directory. Ensure the new path is valid and writable.",
            "You have canceled the change to the catalog": "You have canceled the change to the catalog",

            "Error fetching system info:": "Error fetching system info:",
            "System Monitor": "System Monitor",
            "Loading system info": "Loading system info",
            "OS": "OS",
            "CPU Cores": "CPU Cores",
            "CPU Usage": "CPU Usage",
            "Memory Usage": "Memory Usage",
            "Used Memory": "Used Memory",
            "Free Memory": "Free Memory",
            "Total Memory": "Total Memory",
            "Could not load system info.": "Could not load system info.",
            "Toggle System Monitor": "Toggle System Monitor",
            "Submit search": "Submit search",
            "Clear search input": "Clear search input",
            "Search files": "Search files",
            "Close": "Close",
            "Search": "Search",

            "Loading disk information": "Loading disk information",
            "No disks found or unable to retrieve disk information": "No disks found or unable to retrieve disk information",
            "Drives and Devices": "Drives and Devices",
            "Click to explore": "Click to explore",
            "free of": "free of",
            "Exploring {{diskPath}} (feature coming soon!)": "Exploring {{diskPath}} (feature coming soon!)",

            "Could not load directory content.": "Could not load directory content.",
            "Error loading directory: {{message}}": "Error loading directory: {{message}}",
            "File preview not yet implemented.": "File preview not yet implemented.",
            "Loading directory": "Loading directory",
            "Go to My Device": "Go to My Device",
            "Refresh": "Refresh",
            "Folder": "Folder",
            "File": "File",
            "This folder is empty.": "This folder is empty",
            "My Computer": "My Computer",
            "Usage information not available": "Usage information not available",
            "Go Up": "Go Up",
            "Loading drives": "Loading drives",
            "Error loading data: {{message}}": "Error loading data: {{message}}",
            "Name": "Name",
            "Size": "Size",
            "Type": "Type",
            "Path": "Path",
            "Modified": "Modified",

            "Click to edit path": "Click to edit path",
            "Current path, editable": "Current path, editable",
            "Retrieve Description": "Retrieve Description",
        }
    },
    zh: { // 中文翻译
        translation: {
            "GoSearch": "GoSearch",
            "AppName": "应用",
            "Version": "版本",
            "Welcome to GoSearch!": "欢迎使用 GoSearch！",
            "Settings": "设置",
            "Loading": "加载中",
            "Loading settings...": "加载设置中...",
            "Go to Home": "返回首页",
            "Back to Home": "返回首页",
            "Search files placeholder": "搜索本地文件 (例如 '报告.docx' 或 '上周大于1MB的图片')",
            "To get started, please add some directories to index in the settings.": "开始之前，请在设置中添加要索引的目录。",
            "Go to Settings": "前往设置",
            "Type in the search bar above to find your files.": "在上方搜索框中输入以查找您的文件。",
            "Currently indexing your files... Please wait.": "正在索引您的文件... 请稍候。",
            "About GoSearch": "关于 GoSearch",
            "GoSearch is a blazing fast local file search and preview tool, built with Go and React.": "GoSearch 是一款基于 Go 和 React 构建的极速本地文件搜索与预览工具。",
            "It aims to provide a seamless and efficient way to find your files instantly.": "它旨在提供一种无缝且高效的方式来即时查找您的文件。",
            "Indexed Directories": "已索引目录",
            "Loading directories...": "正在加载目录...",
            "No directories are currently indexed.": "当前没有索引任何目录。",
            "Remove directory": "移除目录",
            "Add Directory...": "添加目录...",
            "Change Directory":"修改目录",
            "Language": "语言",
            "Theme": "主题",
            "Light": "浅色",
            "Dark": "深色",
            "Theme Changed successfully!": "主题切换成功",
            "Could not load directories.": "无法加载目录。",
            "Failed to add directory. Ensure it's a valid path and not already indexed.": "添加目录失败。请确保路径有效且未被索引。",
            "Failed to remove directory.": "移除目录失败。",
            "Data and Configuration Directory": "数据和配置目录",
            "Current data & config directory": "当前数据 & 配置目录",
            "Changing this directory will move where GoSearch stores its main configuration (like theme, language) and all its data (like file indexes). This might require an app restart and data re-indexing if not migrated automatically.":
                "更改此目录将更改 GoSearch 存储主要配置和所有数据。如果不进行迁移，则需要重新启动应用程序并重新索引数据。",
            "Could not load settings data.": "无法加载设置数据。",
            "Error saving language preference:": "保存语言首选项时出错：",
            "Failed to save language preference.": "保存语言首选项失败",

            "Confirm Action": "确认操作",
            "You are already using this language.": "您已经在使用这种语言。",
            "Confirm Language Change": "确认语言更改",
            "Are you sure you want to proceed?": "您确定要继续吗？",
            "Are you sure you want to change the language to {{lang}}?": "确认将语言调整至{{lang}}",
            "Change": "更换",
            "Cancel": "取消",
            "Changing": "修改中",
            "Language Changed successfully!": "语言修改成功",

            "The selected directory is the same as the current one.": "选择的目录与当前目录相同。",
            "Data and configuration directory changed successfully! An application restart may be required for all changes to take full effect.": "数据和配置目录更改成功！重新启动应用程序才能使所有更改完全生效。",
            "Failed to change data directory. Ensure the new path is valid and writable.": "更改数据目录失败。确保新路径有效且可写",
            "You have canceled the change to the catalog": "您已取消更改目录",

            "Error fetching system info:": "获取系统信息失败:",
            "System Monitor": "系统监视器",
            "Loading system info": "加载系统信息中",
            "OS": "操作系统",
            "CPU Cores": "CPU 核心数",
            "CPU Usage": "CPU 占用",
            "Memory Usage": "内存占用",
            "Used Memory": "内存已使用",
            "Free Memory": "内存空闲",
            "Total Memory": "总内存",
            "Could not load system info.": "加载系统信息失败",
            "Toggle System Monitor": "切换系统监视器",
            "Submit search": "提交",
            "Clear search input": "清除内容",
            "Search files": "搜索文件",
            "Close": "关闭",
            "Search": "搜索",

            "Loading disk information": "加载磁盘信息中",
            "No disks found or unable to retrieve disk information": "找不到磁盘或无法检索磁盘信息",
            "Drives and Devices": "驱动和设备",
            "Click to explore": "点击索引",
            "free of": "空闲",
            "Exploring {{diskPath}} (feature coming soon!)": "索引 {{diskPath}} (即将实现)",

            "Could not load directory content.": "无法加载目录内容。",
            "Error loading directory: {{message}}": "加载目录时出错：{{Message}",
            "File preview not yet implemented.": "文件预览尚未实现。",
            "Loading directory": "加载文件夹中",
            "Go to My Device": "我的电脑",
            "Refresh": "刷新",
            "Folder": "文件夹",
            "File": "文件",
            "Path": "路径",
            "This folder is empty": "文件夹为空",
            "My Computer": "我的电脑",
            "Usage information not available": "文件大小信息获取失败",
            "Go Up": "返回上一级",
            "Loading drives": "加载驱动器",
            "Error loading data: {{message}}": "加载数据时出错: {{message}}",
            "Name": "名称",
            "Size": "大小",
            "Type": "类型",
            "Modified": "修改时间",

            "Click to edit path": "点击编辑",
            "Current path, editable": "当前路径",
            "Retrieve Description": "查看检索说明"
        }
    }
};

i18n
    .use(LanguageDetector) // 使用语言检测器
    .use(initReactI18next) // 将 i18n 实例传递给 react-i18next
    .init({
        resources,
        fallbackLng: 'en', // 如果检测不到语言，则默认使用英语
        debug: process.env.NODE_ENV === 'development', // 开发模式下开启 debug
        interpolation: {
            escapeValue: false, // React 已经做了 XSS 防护
        },
        detection: {
            // 配置语言检测顺序和方式
            order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
            lookupLocalStorage: 'appLanguage', // <--- 确保这个 key 与你保存时使用的 key 一致
            caches: ['localStorage'], // 将检测到的语言缓存在 localStorage
        },
    });

export default i18n;