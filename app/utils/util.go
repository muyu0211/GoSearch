package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
)

/*
确保方法的低耦合性, utils内方法不相互调用, 保证方法间相互独立
*/

// IsPathExist 判断文件/文件夹是否存在
func IsPathExist(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, errors.New("file is not Exist")
	} else if os.IsPermission(err) {
		return false, errors.New("permission is denied")
	} else { // 其他错误
		return false, err
	}
}

// EnsureDirExists 确保目录存在，如果不存在则创建 perms 通常是 0755 或 0700
func EnsureDirExists(dirPath string, perms os.FileMode) error {
	var (
		exist bool
		err   error
	)
	// 目录不存在 则递归创建文件夹
	if exist, _ = IsPathExist(dirPath); !exist {
		if err = os.MkdirAll(dirPath, perms); err != nil {
			if os.IsPermission(err) {
				return fmt.Errorf("permission denied to create directory at %s: %v", dirPath, err)
			}
			return fmt.Errorf("failed to create  directory at %s: %v", dirPath, err)
		}
	}
	return nil
}

// StoreFile 写文件操作
func StoreFile(path string, data []byte) error {
	if path == "" {
		return fmt.Errorf("path is empty")
	}
	if data == nil {
		return fmt.Errorf("data is empty")
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		if os.IsPermission(err) {
			return fmt.Errorf("permission denied to write data at %s: %v", path, err)
		}
		return fmt.Errorf("StoreFile: failed to write data to %s: %w", path, err)
	}
	return nil
}

func RemoveFile(path string) error {
	err := os.Remove(path)
	if err != nil {
		log.Printf("Remove %s error", path)
		return err
	}
	return nil
}

func GetParentPath(os string, path string) (string, string) {
	idx := 0
	if os == WINDOWS {
		idx = strings.LastIndex(path, "\\")
	} else {
		idx = strings.LastIndex(path, "/")
	}
	return path[:idx], path[idx+1:]
}

func Join(elem ...string) string {
	if len(elem) > 0 && strings.HasSuffix(elem[0], ":") {
		elem[0] += "\\"
	}
	return filepath.Join(elem...)
}

// UnmarshalJSON 解析json字符串
func UnmarshalJSON(response string, instance interface{}) error {
	decoder := json.NewDecoder(strings.NewReader(response))
	if err := decoder.Decode(&instance); err == io.EOF {
		return nil
	} else if err != nil {
		return err
	}
	return nil
}
