package controller

import (
	"GoSearch/app/service"
	"fmt"
	"sync"
)

// API 定义空的结构体，用于将包级别函数组织为 Wails 可绑定的方法
type API struct {
	Base
}

func NewAPI() *API {
	// 初始化 systemInfo 单例对象
	service.GetSysInfoInstance()
	return &API{}
}

func (api *API) GetAppConfig() (*service.AppConfig, error) {
	if service.AppConf != nil {
		return service.AppConf, nil
	}
	return nil, fmt.Errorf("app config is nil")
}

func (api *API) GetBootConfig() (*service.BootAppConfig, error) {
	if service.BootConf != nil {
		return service.BootConf, nil
	}
	return nil, fmt.Errorf("boot config is nil")
}

func (api *API) SetAppConfig(config *service.AppConfig) error {
	// 对比字段, 防止前端传递过来的空字段值覆盖配置文件
	if err := service.SetAppConfig(config); err != nil {
		return err
	}
	return nil
}

func (api *API) SetBootConfig(desDir string) error {
	// 对比字段, 防止前端传递过来的空字段值覆盖配置文件
	if err := service.ChangeBootConfig(desDir); err != nil {
		return err
	}
	return nil
}

// ============ 绑定SystemInfo api ============
func (api *API) GetSystemInfo() (*service.SystemInfo, error) {
	// 获取单例对象
	instance := service.GetSysInfoInstance()
	wg := &sync.WaitGroup{}

	wg.Add(1)
	go func(wg *sync.WaitGroup) {
		defer wg.Done()
		instance.UpdateCpuInfo()
	}(wg)

	wg.Add(1)
	go func(wg *sync.WaitGroup) {
		defer wg.Done()
		instance.UpdateMemInfo()
	}(wg)
	// 等待更新完成
	wg.Wait()

	return instance, nil
}
