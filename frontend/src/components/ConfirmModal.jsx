// frontend/src/components/ConfirmModal.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import './ConfirmModal.css'; // 我们将创建这个 CSS 文件

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText, cancelText }) {
    const { t } = useTranslation();

    if (!isOpen) {
        return null;
    }

    return (
        <div className="confirm-modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
            <div className="confirm-modal-content">
                <h3 className="confirm-modal-title">{title || t('Confirm Action')}</h3>
                <p className="confirm-modal-message">{message || t('Are you sure you want to proceed?')}</p>
                <div className="confirm-modal-actions">
                    <button onClick={onCancel} className="confirm-modal-btn cancel">
                        {cancelText || t('Cancel')}
                    </button>
                    <button onClick={onConfirm} className="confirm-modal-btn confirm">
                        {confirmText || t('Confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;