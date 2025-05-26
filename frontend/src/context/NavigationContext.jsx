import React, { createContext, useState, useContext } from 'react';

// 1. 创建 Context 对象
const NavigationContext = createContext(null);

// 2. 创建 Provider 组件
export const NavigationProvider = ({ children }) => {
    const [currentPage, setCurrentPage] = useState('home'); // 初始状态为 'home'

    // navigateTo 函数可以封装 setCurrentPage，未来可能添加其他逻辑
    const navigateTo = (page) => {
        setCurrentPage(page);
    };

    const value = {
        currentPage,
        navigateTo,
        setCurrentPage,
    };

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

// 3. 创建自定义 Hook 以方便消费 Context
export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};