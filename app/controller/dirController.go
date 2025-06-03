package controller

import (
	"GoSearch/app/service"
	"GoSearch/app/utils"
	"errors"
	"fmt"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"log"
	"os"
	"strings"
)

type DirController struct {
	Base
	pathCache        *service.PathCache
	isIndexing       bool
	totalFileIndexed int
}

func NewDirController() *DirController {
	return &DirController{
		pathCache: service.GetPathCache(),
	}
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

// GetDiskInfo 获取系统盘符信息
func (d *DirController) GetDiskInfo() ([]service.Disk, error) {
	var (
		// 获取信息信息单例对象
		//sysInfo = service.GetSysInfoInstance()
		disks   []service.Disk
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
		disks = append(disks, service.Disk{
			Device:      info.Device,
			MountPoint:  info.Device,
			FSType:      info.Fstype,
			Total:       useStat.Total,
			Used:        useStat.Used,
			Free:        useStat.Free,
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

// IndexDir 获取当前路径下的文件和文件夹
func (d *DirController) IndexDir(dirPath string, useCache bool) (*service.DirContent, error) {
	// 查找cache是否命中
	var (
		dirCnt *service.DirContent
		ok     bool
		err    error
	)

	if useCache {
		// Cache命中
		if dirCnt, ok = d.pathCache.Get(dirPath); ok {
			log.Printf("cache命中")
			return dirCnt, err
		}
	}
	dirCnt = service.NewDirContent()
	if err = dirCnt.GetDirCnt(dirPath); err != nil {
		log.Printf("Get Directory Content Error: %v", err)
		return nil, err
	}
	if err = d.pathCache.Put(dirCnt); err != nil {
		log.Printf("Cache put error: %v", err)
		return nil, err
	}

	return dirCnt, nil
}

// IndexFile 查找指定文件
func (d *DirController) IndexFile(filePath string) (*service.FileSystemEntry, error) {
	var (
		fileInfo os.FileInfo
		err      error
	)
	// 判断用户输入的是否是完整的文件绝对路径
	if fileInfo, err = os.Stat(filePath); err != nil {
		if os.IsNotExist(err) {
			return nil, errors.New("file is not Exist")
		} else if os.IsPermission(err) {
			return nil, errors.New("permission is denied")
		} else {
			return nil, err
		}
	}

	return &service.FileSystemEntry{
		Name:    fileInfo.Name(),
		Path:    filePath,
		IsDir:   false,
		Size:    fileInfo.Size(),
		ModTime: fileInfo.ModTime(),
		Mode:    fileInfo.Mode(),
	}, nil
}

// GetSearchInput 处理用户搜索框输入
func (d *DirController) GetSearchInput(target string, currDirPath string) ([]*service.FileSystemEntry, error) {
	// TODO: 解析用户输入: 当用户输入的不是绝对路径时会调用该函数
	return nil, nil
}

// GetRetrieveDes 文件检索说明
func (d *DirController) GetRetrieveDes() (string, error) {
	return runtime.MessageDialog(d.ctx, runtime.MessageDialogOptions{
		Type:    runtime.InfoDialog,
		Title:   "文件检索说明",
		Message: "文件检索说明",
	})
}

// CreateItem TODO: 创建文件夹/文件
func (d *DirController) CreateItem(dirPath string, dirName string) error {
	return nil
}

// RenameItem 重命名文件夹/文件
func (d *DirController) RenameItem(path string, newName string) error {
	if path == "" {
		return fmt.Errorf("path is null")
	}
	var (
		sysInfo *service.SystemInfo
		dirPath string
		dirCnt  *service.DirContent
		err     error
	)
	sysInfo = service.GetSysInfoInstance()
	dirPath, _ = utils.GetParentPath(sysInfo.OS, path)

	// 为了防止数据不一致性, 直接从cache中删除父文件夹条目
	dirCnt = d.pathCache.Remove(dirPath)
	if err = dirCnt.RenameItem(path, dirPath, newName); err != nil {
		log.Printf("RenameItem error: %v", err)
		return err
	}
	return nil
}

// DeleteItem 删除文件夹/文件
func (d *DirController) DeleteItem(path string) error {
	if path == "" {
		return fmt.Errorf("path is null")
	}
	var (
		sysInfo = service.GetSysInfoInstance()
		dirPath string
		dirCnt  *service.DirContent
		err     error
	)
	dirPath, _ = utils.GetParentPath(sysInfo.OS, path)
	dirCnt = d.pathCache.Remove(dirPath)
	if err = dirCnt.DeleteItem(path); err != nil {
		return err
	}
	return nil
}
