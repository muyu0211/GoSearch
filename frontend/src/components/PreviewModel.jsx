import React, {useState, useEffect, useRef} from 'react';
import { useTranslation } from 'react-i18next';
import './PreviewModel.css';
// import { GetImageAsBase64 } from '../../wailsjs/go/controller/FileOperationsAPI';
// import { GetTextFilePreview } from '../../wailsjs/go/controller/FileOperationsAPI'; // 假设有这个 API

const MAX_TEXT_PREVIEW_LENGTH = 200; // 文本预览最大字符数

function PreviewModal({ isOpen, item, position,  onMouseEnter, onMouseLeave }) {
    const { t } = useTranslation();
    const [previewContent, setPreviewContent] = useState(null);
    const [previewType, setPreviewType] = useState('none');
    const [isLoading, setIsLoading] = useState(false);
    const [isActuallyOpen, setIsActuallyOpen] = useState(false); // 新增 state 控制动画类
    const modalRef = useRef(null); // Ref for the modal itself for potential future use

    useEffect(() => {
        if (isOpen && item) {
            setIsLoading(true);
            setPreviewContent(null);
            const extension = item.name?.split('.').pop()?.toLowerCase() || '';

            if (item.is_dir) {
                setPreviewType('info');
                setPreviewContent({ name: item.name, type: t('Folder') });
                setIsLoading(false);
            } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
                setPreviewType('image');
                // GetImageAsBase64(item.path)
                //     .then(base64Data => {
                //         setPreviewContent(base64Data);
                //     })
                //     .catch(err => {
                //         console.error("Error loading image preview:", err);
                //         setPreviewType('unsupported');
                //         setPreviewContent(t('Could not load image preview.'));
                //     })
                //     .finally(() => setIsLoading(false));
            } else if (['txt', 'md', 'log', 'json', 'xml', 'js', 'ts', 'py', 'go', 'html', 'css'].includes(extension)) {
                setPreviewType('text');
                // 假设 GetTextFilePreview 返回 { content: string, truncated: boolean }
                // GetTextFilePreview(item.path, MAX_TEXT_PREVIEW_LENGTH)
                //     .then(data => {
                //         setPreviewContent(data.content + (data.truncated ? '...' : ''));
                //     })
                //     .catch(err => {
                //         console.error("Error loading text preview:", err);
                //         setPreviewType('unsupported');
                //         setPreviewContent(t('Could not load text preview.'));
                //     })
                //     .finally(() => setIsLoading(false));
            } else {
                setPreviewType('unsupported');
                setPreviewContent(t('Preview not available for this file type.'));
                setIsLoading(false);
            }

            const timer = setTimeout(() => {
                setIsActuallyOpen(true);
            }, 20); // 一个非常短的延迟，例如 20ms，有时甚至 0ms 也可以
            return () => clearTimeout(timer);
        } else {
            setIsLoading(false);
        }
    }, [isOpen, item, t]);

    if (!isOpen && !isActuallyOpen) {
        return null;
    }

    const style = {
        position: 'fixed', // 使用 fixed 定位，相对于视口
        // left: position.x + 15, // 在鼠标右侧一点
        // top: position.y + 15,  // 在鼠标下方一点
        left: `min(${position.x + 15}px, calc(100vw - 320px))`, // 320px 是预估的弹窗宽度+边距
        top:  `min(${position.y + 15}px, calc(100vh - 220px))`, // 220px 是预估的弹窗高度+边距
    };


    return (
        <div  ref={modalRef}
              className={`preview-modal-tooltip ${isActuallyOpen && isOpen ? 'visible' : ''}`}
              style={style}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
        >
            {isLoading ? (
                <p className="preview-loading-text">{t('Loading')}</p>
            ) : (
                <>
                    {previewType === 'image' && previewContent && (
                        <img src={previewContent} alt={item.name} className="preview-image-content" />
                    )}
                    {previewType === 'text' && previewContent && (
                        <pre className="preview-text-content">{previewContent}</pre>
                    )}
                    {previewType === 'info' && previewContent && (
                        <div className="preview-info-content">
                            <p><strong>{previewContent.name}</strong></p>
                            <p>{previewContent.type}</p>
                        </div>
                    )}
                    {previewType === 'unsupported' && previewContent && (
                        <p className="preview-unsupported-text">{previewContent}</p>
                    )}
                </>
            )}
        </div>
    );
}

export default React.memo(PreviewModal);