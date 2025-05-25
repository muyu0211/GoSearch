package controller

import (
	"fmt"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"log"
	"strings"
)

type DirController struct {
	Base
	isIndexing       bool
	totalFileIndexed int
	lastScanTime     string
}

// Disk 磁盘信息
type Disk struct {
	Total uint64 `json:"total"` // 总空间 (bytes)
	Free  uint64 `json:"free"`  // 可用空间 (bytes)
	Used  uint64 `json:"used"`  // 已用空间 (bytes)
}
type Directory struct {
	Name string
	Addr string
}
type File struct {
	Name string
	Addr string
}

type Cache struct {
	Disks map[string][]Disk
	Files map[string][]File
}

func NewDirController() *DirController {
	return &DirController{}
}

func (d *DirController) GetAppStatus() (map[string]interface{}, error) {
	log.Println("Backend API: GetAppStatus called.")

	return map[string]interface{}{
		"isIndexing": d.isIndexing,
	}, nil
}

// OpenDirectory 打开目录选择器
func (d *DirController) OpenDirectory(defaultDir string) (string, error) {
	selection, err := runtime.OpenDirectoryDialog(d.ctx, runtime.OpenDialogOptions{
		DefaultDirectory: defaultDir,
		Title:            "选择文件夹",
	})
	if err != nil {
		// 检查是否是已知的“用户取消”错误
		if strings.Contains(err.Error(), "shellItem is nil") ||
			strings.Contains(err.Error(), "User cancelled") ||
			strings.Contains(err.Error(), "cancel") {
			log.Println("Go: User cancelled directory selection (inferred from error).")
			return "", nil
		}
		return "", err
	}
	if selection == "" {
		log.Println("Go: User cancelled directory selection.")
		return "", nil
	}
	return selection, nil
}

// GetInitialDir 获取上一次索引的目录信息
func (d *DirController) GetInitialDir(lastDir string) {
	// 如果为空则获取初始盘符信息
	fmt.Println("============================ 获取上一次索引的目录信息 ============================")
	//GetDiskInfo()
}

//func GetDiskInfo() ([]Disk, error) {
//	var (
//		disks []Disk
//	)
//	if Sys.OS == utils.WINDOWS {
//
//	} else if Sys.OS == utils.LINUX {
//
//	} else {
//		return nil, fmt.Errorf("unsupported operating system: %s", Sys.OS)
//	}
//	return disks, nil
//}
