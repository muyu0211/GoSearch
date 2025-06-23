// 辅助函数：格式化字节和日期
import {isWindows} from "react-device-detect";

export const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes <= 0) return '0 B'; // 处理 0 或负数
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i >= sizes.length) return bytes + ' B';
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // 可以使用更友好的格式，例如 date-fns 库
        return date.toLocaleString(); // 或者 date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        return dateString;
    }
};

export function getParentPath(filePath) {
    if (isWindows) {
        // Windows 系统处理逻辑
        // 移除最后的文件名部分，保留路径分隔符后的所有内容
        const lastIndex = filePath.lastIndexOf('\\');
        return lastIndex !== -1 ? filePath.substring(0, lastIndex) : '';
    } else {
        // macOS/Linux 系统处理逻辑
        const lastIndex = filePath.lastIndexOf('/');
        return lastIndex !== -1 ? filePath.substring(0, lastIndex) : '';
    }
}

export function splitSegment(filePath) {

}