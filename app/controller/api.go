package controller

import (
	"GoSearch/app/service"
	"fmt"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"log"
	"sync"
)

// API 定义空的结构体，用于将包级别函数组织为 Wails 可绑定的方法
type API struct {
	Base
	appConf  *service.AppConfig
	bootConf *service.BootAppConfig
	userData *service.UData
}

func NewAPI() *API {
	// 初始化 systemInfo 单例对象
	service.GetSysInfoInstance()
	// 使用引导配置文件进行app启动
	var (
		appConf  *service.AppConfig
		bootConf *service.BootAppConfig
		userData *service.UData
		err      error
	)

	if bootConf, appConf, err = service.EnsureConfigInitialized(); err != nil {
		log.Println("Get AppConfig Error:", err)
	}

	if userData, err = service.GetUserData(); err != nil {
		log.Print("Get User Data Error:", err)
	}

	return &API{
		appConf:  appConf,
		bootConf: bootConf,
		userData: userData,
	}
}

func (api *API) CloseResource() {
	var (
		err error
	)
	// 保存配置文件
	if api.appConf != nil {
		if err = api.appConf.StoreAppConfig(); err != nil {
			log.Printf("Shutdown error: %v", err.Error())
		}
	}
	// 保存用户数据文件
	if api.userData != nil {
		if err = api.userData.StoreUserData(); err != nil {
			log.Printf("Shutdown error: %v\n", err.Error())
		}
	}
}

func (api *API) GetAppConfig() (*service.AppConfig, error) {
	if api.appConf != nil {
		return api.appConf, nil
	}
	return nil, fmt.Errorf("app config is nil")
}

func (api *API) GetBootConfig() (*service.BootAppConfig, error) {
	if api.bootConf != nil {
		return api.bootConf, nil
	}
	return nil, fmt.Errorf("boot config is nil")
}

func (api *API) SetAppConfig(config *service.AppConfig) error {
	// 对比字段, 防止前端传递过来的空字段值覆盖配置文件
	if err := api.appConf.SetAppConfig(config); err != nil {
		return err
	}
	return nil
}

// SetBootConfig 修改用户配置文件和数据文件保存位置
func (api *API) SetBootConfig(desDir string) error {
	// 对比字段, 防止前端传递过来的空字段值覆盖配置文件
	if err := api.bootConf.SetBootConfig(desDir); err != nil {
		return err
	}
	return nil
}

func (api *API) GetUserData() (*service.UData, error) {
	if api.userData != nil {
		return api.userData, nil
	}
	return nil, fmt.Errorf("user data is nil")
}

func (api *API) SetUserData(userData *service.UData) error {
	if err := api.userData.SetUserData(userData); err != nil {
		return err
	}
	// 将修改后的数据保存至文件夹
	if err := api.userData.StoreUserData(); err != nil {
		return err
	}
	return nil
}

func (api *API) TestLLM() (string, error) {
	str := service.TestLLM()
	return runtime.MessageDialog(api.ctx, runtime.MessageDialogOptions{
		Type:    runtime.InfoDialog,
		Title:   "LLM Test",
		Message: str,
	})
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
