package service

import (
	"GoSearch/app/utils"
	"encoding/json"
	"fmt"
	"github.com/spf13/viper"
	"log"
	"reflect"
	"sync"
)

var (
	userData     *UData
	userDataOnce sync.Once
)

type UData struct {
	Model        string `json:"model" mapstructure:"model"`
	BaseURL      string `json:"base_url" mapstructure:"base_url"`
	ApiKey       string `json:"api_key" mapstructure:"api_key"`
	IsOpenAI     bool   `json:"is_open_ai" mapstructure:"is_open_ai"`
	dataFilePath string
	uLock        sync.Locker
}

func GetUserData() (*UData, error) {
	var (
		dataFilePath    string
		err             error
		exist           bool
		data            []byte
		defaultUserData *UData
	)
	// 应用启动只读取一次文件
	userDataOnce.Do(func() {
		_, appConf, _ = EnsureConfigInitialized()
		dataDir := appConf.CustomDataDir
		dataFilePath = utils.Join(dataDir, utils.UserDataFileName)
		defaultUserData = &UData{
			dataFilePath: dataFilePath,
			uLock:        &sync.RWMutex{},
		}

		// 1.判断是否存在数据文件
		if exist, err = utils.IsPathExist(dataFilePath); err != nil {
			return
		}
		// 2.不存在则创建
		if !exist {
			data, _ = json.MarshalIndent(defaultUserData, "", " ")
			if err = utils.EnsureDirExists(dataDir, 0755); err != nil {
				log.Println(err)
				return
			}
			if err = utils.StoreFile(dataFilePath, data); err != nil {
				log.Println(err)
				return
			}
			userData = defaultUserData
			return
		}

		// 3.存在则直接解析
		userData = defaultUserData
		if err = parseUserData(dataDir, userData); err != nil {
			return
		}

		if err != nil && userData == nil {
			userData = defaultUserData
		}
	})

	return userData, nil
}

func parseUserData(dirPath string, userData *UData) error {
	var (
		v   = viper.New()
		err error
	)
	v.SetConfigFile(utils.Join(dirPath, "data.json"))
	if err = v.ReadInConfig(); err != nil {
		return fmt.Errorf("viper failed to read data file %s: %w", dirPath, err)
	}
	if err = v.Unmarshal(userData); err != nil {
		return fmt.Errorf("viper failed to unmarshal user data from %s: %w", dirPath, err)
	}
	return nil
}

func (u *UData) SetUserData(newUserData *UData) error {
	u.uLock.Lock()
	defer u.uLock.Unlock()

	// 确保userData对象不为nil
	GetUserData()

	curDataVal := reflect.ValueOf(u).Elem()
	newDataVal := reflect.ValueOf(newUserData).Elem()

	if newDataVal.Kind() != reflect.Struct || newDataVal.Kind() != curDataVal.Kind() {
		return fmt.Errorf("SetUserDataError: type mismatch between current (%s) and new newData (%s)", curDataVal.Type(), newDataVal.Type())
	}

	for i := 0; i < newDataVal.NumField(); i++ {
		// 跳过未导出字段
		fieldType := newDataVal.Type().Field(i)
		if fieldType.PkgPath != "" {
			continue
		}
		newField := newDataVal.Field(i)
		curField := curDataVal.Field(i)
		if newField.IsValid() {
			if !reflect.DeepEqual(newField.Interface(), curField.Interface()) {
				if curField.CanSet() {
					curField.Set(newField)
				}
			}
		}
	}
	return nil
}

// StoreUserData 保存用户数据
func (u *UData) StoreUserData() error {
	var (
		data []byte
		err  error
	)
	if data, err = json.MarshalIndent(u, "", " "); err != nil {
		return fmt.Errorf("failed to marshal default user data: %w", err)
	}
	if data == nil || len(data) == 0 || string(data) == "null" {
		return fmt.Errorf("data is null")
	}
	// 保存文件
	if err = utils.StoreFile(u.dataFilePath, data); err != nil {
		return err
	}
	return nil
}
