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
	"time"
)

type DirController struct {
	Base
	pathCache        *service.PathCache
	isIndexing       bool
	totalFileIndexed int
}

type SearchParams struct {
	Query          string `json:"query"`
	CurrentPath    string `json:"current_path"` // 当前搜索的目录
	ModifiedAfter  string `json:"modified_after"`
	ModifiedBefore string `json:"modified_before"`
}

type SearchResponse struct {
	Items      []*service.FileSystemEntry `json:"items"`
	DurationNs time.Duration              `json:"duration_ns"`
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

func (d *DirController) SearchItemFromInput(searchParams *SearchParams) (*SearchResponse, error) {
	var (
		params *service.SearchParams
		items  []*service.FileSystemEntry
		err    error
	)
	if searchParams.CurrentPath == "" {
		return nil, fmt.Errorf("search base directory cannot be empty for this implementation")
	}

	start := time.Now()
	if params, err = service.ParseParams(searchParams.Query, searchParams.CurrentPath); err != nil {
		return nil, err
	}

	// 处理额外的搜索参数
	if searchParams.ModifiedAfter != "" {
		// 解析时间字符串
		if modifiedAfter, err := time.Parse(utils.TimeLayOut, searchParams.ModifiedAfter); err == nil {
			params.ModifiedAfter = &modifiedAfter
		}
	}
	if searchParams.ModifiedBefore != "" {
		// 解析时间字符串
		if modifiedBefore, err := time.Parse(utils.TimeLayOut, searchParams.ModifiedBefore); err == nil {
			params.ModifiedBefore = &modifiedBefore
		}
	}
	//log.Println("开始时间:", params.ModifiedBefore.Unix())
	//log.Println("结束时间:", params.ModifiedAfter.Unix())

	if items, err = service.SearchItems(params); err != nil {
		return nil, err
	}

	return &SearchResponse{Items: items, DurationNs: time.Since(start)}, nil
}

func (d *DirController) SearchItemFromInputInStream(searchParams *SearchParams) error {
	var (
		stream <-chan *service.FileSystemEntry
		params *service.SearchParams
		err    error
	)
	if searchParams.CurrentPath == "" {
		return fmt.Errorf("search base directory cannot be empty for this implementation")
	}

	if params, err = service.ParseParams(searchParams.Query, searchParams.CurrentPath); err != nil {
		return err
	}

	// 处理额外的搜索参数
	if searchParams.ModifiedAfter != "" {
		// 解析时间字符串
		if modifiedAfter, err := time.Parse(utils.TimeLayOut, searchParams.ModifiedAfter); err == nil {
			params.ModifiedAfter = &modifiedAfter
		}
	}
	if searchParams.ModifiedBefore != "" {
		// 解析时间字符串
		if modifiedBefore, err := time.Parse(utils.TimeLayOut, searchParams.ModifiedBefore); err == nil {
			params.ModifiedBefore = &modifiedBefore
		}
	}

	if stream, err = service.SearchItemsInStream(params); err != nil {
		return err
	}

	func() {
		cnt := 0
		for item := range stream {
			cnt += 1
			runtime.EventsEmit(d.ctx, "search_stream", item)
		}
		// 标记结束
		runtime.EventsEmit(d.ctx, "search_stream", nil)
	}()
	return nil
}

func (d *DirController) SearchItemFromLLM(searchParams *SearchParams) (*SearchResponse, error) {
	var (
		params *service.SearchParams
		items  []*service.FileSystemEntry
		err    error
	)
	if searchParams.CurrentPath == "" {
		return nil, fmt.Errorf("search base directory cannot be empty for this implementation")
	}

	if params, err = service.ParseParamsFromLLM(searchParams.Query); err != nil {
		return nil, err
	}
	params.BaseDir = searchParams.CurrentPath
	start := time.Now()
	if items, err = service.SearchItems(params); err != nil {
		return nil, err
	}

	return &SearchResponse{Items: items, DurationNs: time.Since(start)}, nil
}

func (d *DirController) SearchItemFromLLMInStream(searchParams *SearchParams) error {
	var (
		stream <-chan *service.FileSystemEntry
		params *service.SearchParams
		err    error
	)
	if searchParams.CurrentPath == "" {
		return fmt.Errorf("search base directory cannot be empty for this implementation")
	}
	if params, err = service.ParseParamsFromLLM(searchParams.Query); err != nil {
		return err
	}
	params.BaseDir = searchParams.CurrentPath

	if stream, err = service.SearchItemsInStream(params); err != nil {
		return err
	}

	func() {
		for item := range stream {
			runtime.EventsEmit(d.ctx, "search_stream", item)
		}
		// 标记结束
		runtime.EventsEmit(d.ctx, "search_stream", nil)
	}()
	return nil
}

// GetRetrieveDes 文件检索说明
func (d *DirController) GetRetrieveDes() (string, error) {
	return runtime.MessageDialog(d.ctx, runtime.MessageDialogOptions{
		Type:  runtime.InfoDialog,
		Title: "文件检索说明",
		Message: "文件检索说明:\n" +
			"1.文件名检索: 直接输入文件名前缀, 将从当前路径下检索所有符合要求的项目;\n" +
			"2.文件类型检索: type: [文件扩展名], 例如: type: txt, 将从当前路径下检索所有.txt文件，也可同时输入多个文件扩展名, type: txt doc;\n" +
			"3.文件大小检索: size: [文件大小], 例如: size: >10B <= 20MB, 将从当前路径下检索所有大小大于10B, 小于20MB的文件;\n" +
			"4.文件日期检索: 点击工具栏中的日期图标(📅)选择日期范围:\n" +
			"   - 只选择开始日期: 查找在该日期及之后修改的文件\n" +
			"   - 只选择结束日期: 查找在该日期及之前修改的文件\n" +
			"   - 同时选择开始和结束日期: 查找在这两个日期之间修改的文件\n" +
			"多个检索关键字可同时使用: type: txt size: >10B <5MB.\n",
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
