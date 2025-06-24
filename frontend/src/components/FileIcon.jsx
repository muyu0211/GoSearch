import React from 'react';
import './FileIcon.css'
// 你可以根据需要选择不同的图标集，例如 'fa' (Font Awesome), 'md' (Material Design), 'fi' (Feather)
import {
    FaFolder, FaFolderOpen,
    FaFile, FaFileAlt, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint,
    FaFileImage, FaFileAudio, FaFileVideo, FaFileArchive, FaFileCode,
    FaQuestionCircle
} from 'react-icons/fa';

function FileIcon({ fileName, isDir, isOpen }) { // isOpen prop 用于文件夹打开/关闭状态 (可选)
    if (isDir) {
        return isOpen ? <FaFolderOpen className="file-icon-svg folder-icon open" /> : <FaFolder className="file-icon-svg folder-icon" />;
    }

    if (!fileName || typeof fileName !== 'string') {
        return <FaQuestionCircle className="file-icon-svg unknown-icon" />;
    }

    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    switch (extension) {
        case 'txt':
        case 'md':
            return <FaFileAlt className="file-icon-svg text-icon" />;
        case 'pdf':
            return <FaFilePdf className="file-icon-svg pdf-icon" />;
        case 'doc':
        case 'docx':
            return <FaFileWord className="file-icon-svg word-icon" />;
        case 'xls':
        case 'xlsx':
            return <FaFileExcel className="file-icon-svg excel-icon" />;
        case 'ppt':
        case 'pptx':
            return <FaFilePowerpoint className="file-icon-svg ppt-icon" />;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'webp':
        case 'svg':
            return <FaFileImage className="file-icon-svg image-icon" />;
        case 'mp3':
        case 'wav':
        case 'ogg':
            return <FaFileAudio className="file-icon-svg audio-icon" />;
        case 'mp4':
        case 'mov':
        case 'avi':
        case 'mkv':
            return <FaFileVideo className="file-icon-svg video-icon" />;
        case 'zip':
        case 'rar':
        case 'tar':
        case 'gz':
        case '7z':
            return <FaFileArchive className="file-icon-svg archive-icon" />;
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
        case 'json':
        case 'html':
        case 'css':
        case 'py':
        case 'go':
        case 'java':
        case 'c':
        case 'cpp':
            return <FaFileCode className="file-icon-svg code-icon" />;
        default:
            return <FaFile className="file-icon-svg default-file-icon" />;
    }
}

export default React.memo(FileIcon); // 使用 React.memo 优化，如果 props 不变则不重渲染