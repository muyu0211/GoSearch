package controller

import (
	"GoSearch/app/utils"
	"encoding/json"
	"fmt"
	"github.com/spf13/viper"
	"log"
	"os"
	"path/filepath"
	"reflect"
	"sync"
)

const (
	configFileName     = "config.json"
	bootConfigFileName = "boot_config.json"
)

// 单例模式
var (
	once     sync.Once      // 用于确保初始化只执行一次
	aLock    sync.RWMutex   // 读写配置文件时加锁
	bLock    sync.RWMutex   // 读写引导文件时加锁
	BootConf *BootAppConfig // 引导配置
	AppConf  *AppConfig     // 主配置文件
)

// AppConfig 配置文件结构
type AppConfig struct {
	AppName       string `json:"app_name" mapstructure:"app_name"`
	AppVersion    string `json:"app_version" mapstructure:"app_version"`
	Theme         string `json:"theme" mapstructure:"theme"`
	Language      string `json:"language" mapstructure:"language"`
	CustomDataDir string `json:"custom_data_dir" mapstructure:"custom_data_dir"`
}

type BootAppConfig struct {
	CustomConfigDir string `json:"custom_config_dir" mapstructure:"custom_config_dir"`
}

// EnsureInitialized 确保单例对象只被初始化一次
func EnsureInitialized() error {
	var err error
	once.Do(func() {
		err = InitializeConfig()
	})
	return err
}

func InitializeConfig() error {
	var (
		bootConfigDir string
		err           error
	)
	// 1. 获取引导文件目录
	if bootConfigDir, err = GetBootConfigDir(); err != nil {
		return err
	}
	// 2. 解析引导文件
	if BootConf, err = GetBootConfig(bootConfigDir); err != nil {
		return err
	}
	if BootConf == nil {
		return fmt.Errorf("boot config is nil after loading/creation")
	}

	// 3. 解析主配置文件
	if AppConf, err = GetAppConfig(BootConf.CustomConfigDir); err != nil {
		return err
	}
	if AppConf == nil {
		return fmt.Errorf("main app config is nil after loading/creation")
	}
	return nil
}

// GetBootConfigDir 获取引导文件目录
func GetBootConfigDir() (string, error) {
	// 从默认路径获取引导文件目录
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("failed to get user config directory: %w", err)
	}
	bootDir := filepath.Join(dir, utils.AppName)
	// 确保配置文件目录存在
	if err = utils.EnsureDirExists(bootDir, 0755); err != nil {
		return "", err
	}
	return bootDir, err
}

// GetBootConfig 获取引导文件
func GetBootConfig(bootConfigDir string) (*BootAppConfig, error) {
	var (
		bootConfigPath = filepath.Join(bootConfigDir, bootConfigFileName)
		bootConf       = &BootAppConfig{}
		data           []byte
		exist          bool
		err            error
	)
	if exist, err = utils.IsPathExist(bootConfigPath); err != nil {
		return nil, err
	}
	if exist {
		// 1. 引导文件存在则尝试解析
		if err = ParseBootConfig(bootConfigPath, bootConf); err == nil {
			// 解析成功直接返回
			return bootConf, nil
		}
		// 解析失败尝试重新创建引导文件
		log.Printf("Parse Boot config error: %s", err)
	}
	// 填入默认的配置文件目录
	defaultBootConf := &BootAppConfig{
		CustomConfigDir: bootConfigDir,
	}
	if data, err = json.MarshalIndent(defaultBootConf, "", " "); err != nil {
		return nil, err
	}
	if err = utils.StoreConfig(bootConfigPath, data); err != nil {
		return nil, err
	}
	return defaultBootConf, nil
}

// GetAppConfig 获取主配置文件
func GetAppConfig(configDir string) (*AppConfig, error) {
	var (
		configPath = filepath.Join(configDir, configFileName)
		conf       = &AppConfig{}
		exist      bool
		err        error
		data       []byte
	)
	if exist, err = utils.IsPathExist(configPath); err != nil {
		return nil, err
	}
	// 1. 配置文件不存在则创建
	if !exist {
		defaultConf := &AppConfig{
			AppName:       utils.AppName,
			AppVersion:    utils.AppVersion,
			Theme:         utils.Theme,
			Language:      utils.Language,
			CustomDataDir: filepath.Join(configDir, "data"),
		}
		if data, err = json.MarshalIndent(defaultConf, "", " "); err != nil {
			return nil, fmt.Errorf("failed to marshal default main config: %w", err)
		}
		if err = utils.EnsureDirExists(configDir, 0755); err != nil {
			return nil, err
		}
		if err = utils.StoreConfig(configPath, data); err != nil {
			return nil, err
		}
		return defaultConf, nil
	}
	// 存在则解析
	if err = ParseAppConfig(configPath, conf); err != nil {
		log.Printf("Parse config: %s error.", configPath)
		// TODO: 考虑解析失败时, 返回默认配置
		return nil, err
	}
	return conf, nil
}

// SetAppConfig 修改主配置信息
func SetAppConfig(newConf *AppConfig) error {
	var (
		err error
	)
	if err = EnsureInitialized(); err != nil {
		return fmt.Errorf("BootConf is nil")
	}

	// 修改主配置信息时加锁
	aLock.Lock()
	defer aLock.Unlock()

	curConfVal := reflect.ValueOf(AppConf).Elem()
	newConfVal := reflect.ValueOf(newConf).Elem()

	if newConfVal.Kind() != reflect.Struct || newConfVal.Kind() != curConfVal.Kind() {
		return fmt.Errorf("SetAppConfig: type mismatch between current (%s) and new newConf (%s)", curConfVal.Type(), newConfVal.Type())
	}
	// 对比字段, 防止前端传递过来的空字段值覆盖配置文件
	for i := 0; i < newConfVal.NumField(); i++ {
		newField := newConfVal.Field(i)
		curField := curConfVal.Field(i)

		if newField.IsValid() && !newField.IsZero() {
			if !reflect.DeepEqual(newField.Interface(), curField.Interface()) {
				if curField.CanSet() {
					curField.Set(newField)
				}
			}
		}
	}
	return nil
}

// ChangeAppConfig 修改主配置文件
func (conf *AppConfig) ChangeAppConfig() error {
	var (
		data []byte
		err  error
	)
	// 修改文件时加锁
	aLock.Lock()
	defer aLock.Unlock()

	if BootConf == nil || conf == nil {
		return fmt.Errorf("BootConf/Conf is nil")
	}
	if data, err = json.MarshalIndent(conf, "", " "); err != nil {
		return fmt.Errorf("failed to marshal default main config: %w", err)
	}
	if data == nil || len(data) == 0 || string(data) == "null" {
		return fmt.Errorf("data is nil")
	}
	// 保存文件
	if err = utils.StoreConfig(filepath.Join(BootConf.CustomConfigDir, configFileName), data); err != nil {
		return err
	}
	return nil
}

// ChangeBootConfig 修改引导文件(配置文件目录)
func ChangeBootConfig(desDir string) error {
	var (
		bootDir string
		data    []byte
		exist   bool
		err     error
	)
	// 修改文件时加锁
	bLock.Lock()
	defer bLock.Unlock()
	// 判断文件夹是否存在
	if exist, err = utils.IsPathExist(desDir); exist != true {
		if err == nil {
			// 如果文件夹不存在则创建
			err = utils.EnsureDirExists(desDir, 0755)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}
	BootConf.CustomConfigDir = desDir
	if bootDir, err = GetBootConfigDir(); err != nil {
		log.Printf("Get Boot Config Dir Error")
		return err
	}
	if data, err = json.MarshalIndent(BootConf, "", " "); err != nil {
		return fmt.Errorf("failed to marshal default main config: %w", err)
	}
	// 修改文件
	if err = utils.StoreConfig(filepath.Join(bootDir, bootConfigFileName), data); err != nil {
		log.Printf(err.Error())
		return err
	}
	return nil
}

// ParseBootConfig 解析引导文件
func ParseBootConfig(path string, config *BootAppConfig) error {
	var (
		v   = viper.New()
		err error
	)
	v.SetConfigFile(path)
	if err = v.ReadInConfig(); err != nil {
		return fmt.Errorf("viper failed to read config file %s: %w", path, err)
	}
	if err = v.Unmarshal(config); err != nil {
		return fmt.Errorf("viper failed to unmarshal config from %s: %w", path, err)
	}
	return nil
}

// ParseAppConfig 解析配置文件
func ParseAppConfig(path string, config *AppConfig) error {
	var (
		v   = viper.New()
		err error
	)
	v.SetConfigFile(path)
	if err = v.ReadInConfig(); err != nil {
		return fmt.Errorf("viper failed to read config file %s: %w", path, err)
	}
	if err = v.Unmarshal(config); err != nil {
		return fmt.Errorf("viper failed to unmarshal config from %s: %w", path, err)
	}
	return nil
}
