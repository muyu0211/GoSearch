package controller

import (
	"GoSearch/app/utils"
	"fmt"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"log"
	"strings"
	"sync"
)

type DirController struct {
	Base
	isIndexing       bool
	totalFileIndexed int
	lastScanTime     string
}

// Disk 磁盘信息
type Disk struct {
	Device      string  `json:"device"`        // 分区标识
	MountPoint  string  `json:"mount_point"`   // 挂载点: 即该分区的文件路径起始位置
	FSType      string  `json:"file_sys_type"` // 文件系统格式
	Total       uint64  `json:"total"`         // 总空间 (bytes)
	Free        uint64  `json:"free"`          // 可用空间 (bytes)
	Used        uint64  `json:"used"`          // 已用空间 (bytes)
	UsedPercent float64 `json:"used_percent"`  // 使用占比
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
	lock  sync.RWMutex
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
}

// GetDiskInfo 获取系统盘符信息
func (d *DirController) GetDiskInfo() ([]Disk, error) {
	var (
		// 获取信息信息单例对象
		//sysInfo = service.GetSysInfoInstance()
		disks   []Disk
		infos   []disk.PartitionStat
		useStat *disk.UsageStat
		err     error
	)
	infos, err = disk.Partitions(true)
	for _, info := range infos {
		// 获取每个分区的占用情况
		useStat, err = disk.Usage(info.Device)
		if useStat == nil || err != nil {
			log.Printf("Get Disk %s error.", info.Device)
			continue
		}
		disks = append(disks, Disk{
			Device:      info.Device,
			MountPoint:  info.Device,
			FSType:      info.Fstype,
			Total:       useStat.Total / utils.MB,
			Used:        useStat.Used / utils.MB,
			Free:        useStat.Free / utils.MB,
			UsedPercent: useStat.UsedPercent,
		})
	}
	//if sysInfo.OS == utils.WINDOWS {
	//
	//} else if sysInfo.OS == utils.LINUX {
	//
	//} else {
	//	return nil, fmt.Errorf("unsupported operating system: %s", Sys.OS)
	//}
	return disks, nil
}
