package controller

import (
	"GoSearch/app/service"
	"GoSearch/app/utils"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"syscall"
)

type FileController struct {
	Base
	sysInfo *service.SystemInfo
}

func NewFileController() *FileController {
	return &FileController{
		sysInfo: service.GetSysInfoInstance(),
	}
}

func (f *FileController) OpenFile(filePath string) error {
	var (
		cmd *exec.Cmd
		err error
	)
	// 1.检查文件是否存在
	if _, err = os.Stat(filePath); err != nil {
		if os.IsNotExist(err) {
			return errors.New("file is not Exist")
		} else if os.IsPermission(err) {
			return errors.New("permission is denied")
		} else {
			return err
		}
	}

	// 2.使用特点操作系统打开文件
	switch f.sysInfo.OS {
	case utils.WINDOWS:
		cmd = exec.Command("cmd", "/c", "start", filePath)
		//cmd = exec.Command("powershell", "Start-Process", filePath)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true} // 隐藏命令行窗口
	case utils.LINUX:
		cmd = exec.Command("xdg-open", filePath)
	case utils.MAC:
		cmd = exec.Command("open", filePath)
	default:
		return fmt.Errorf("不支持的操作系统: %s", f.sysInfo.OS)
	}

	// 3.命令执行时清理环境变量
	var newEnv []string
	for _, env := range cmd.Env {
		if !strings.Contains(env, "WEBVIEW2_") {
			newEnv = append(newEnv, env)
		}
	}
	cmd.Env = newEnv
	return cmd.Start()
}

// PreviewFile 预览文件内容
//func (f *FileController) PreviewFile(filePath string) ([]byte, error) {
//
//}
