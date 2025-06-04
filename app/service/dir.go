package service

import (
	"GoSearch/app/utils"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unsafe"
)

// FileSystemEntry 通用文件/目录条目
type FileSystemEntry struct {
	Path       string      `json:"path"`     // 完整绝对路径
	Name       string      `json:"name"`     // 文件或目录名 (例如 "document.txt", "MyFolder")
	IsDir      bool        `json:"is_dir"`   // 是否为目录
	Size       int64       `json:"size"`     // 文件大小 (字节)，目录通常为 0 或特殊值
	ModTime    time.Time   `json:"mod_time"` // 最后修改时间
	Mode       os.FileMode `json:"mode"`     // 文件模式 (权限等)，可能不需要序列化给前端
	IsModified bool        // 记录当前item是否被修改过（内容、名称等）
	// IconType     string      `json:"icon_type"`     // 可选: 前端用于显示图标的类型 ("file", "folder-image", "file-pdf", etc.)
	// SymlinkPath  string      `json:"symlink_path,omitempty"` // 如果是符号链接，指向的实际路径
}

// DirContent 表示一个目录下的内容
type DirContent struct {
	Path        string                      `json:"path"`            // 当前文件夹的绝对路径
	Files       map[string]*FileSystemEntry `json:"files"`           // 该目录下的所有文件
	SubDirs     map[string]*FileSystemEntry `json:"sub_dirs"`        // 该目录下的所有子文件夹
	Error       error                       `json:"error,omitempty"` // 如果扫描此目录时发生错误
	Size        uint64
	LastIndex   time.Time
	ExpiredTime time.Time   // 设置过期时间
	IsModified  bool        // 记录当前文件夹下是否有item被修改
	next, pre   *DirContent // 双向链表
}

func NewDirContent() *DirContent {
	return &DirContent{}
}

// GetDirCnt 获取文件夹内容
func (dirCnt *DirContent) GetDirCnt(dirPath string) error {
	var (
		dir   *os.File
		err   error
		files []os.FileInfo
	)
	if dir, err = os.Open(dirPath + utils.SEGMENT); err != nil {
		log.Printf("Error opening directory: %v", err)
		switch {
		case os.IsPermission(err):
			return errors.New("permission denied")
		case os.IsNotExist(err):
			return errors.New("directory is not exist")
		default:
			if err = dir.Close(); err != nil {
				return err
			}
			return err
		}
	}
	defer func(dir *os.File) {
		if err = dir.Close(); err != nil {
			log.Println(err)
		}
	}(dir)
	if files, err = dir.Readdir(-1); err != nil {
		log.Printf("Error reading directory: %v", err)
		return err
	}
	dirCnt.Path = dirPath
	dirCnt.Files = make(map[string]*FileSystemEntry)
	dirCnt.SubDirs = make(map[string]*FileSystemEntry)
	// 遍历文件夹中的文件和子文件夹
	for _, file := range files {
		fileInfo := &FileSystemEntry{
			Name:    file.Name(),
			Path:    filepath.Join(dirPath, utils.SEGMENT, file.Name()),
			Mode:    file.Mode(),
			IsDir:   file.IsDir(),
			Size:    file.Size(),
			ModTime: file.ModTime(),
		}
		if fileInfo.IsDir {
			dirCnt.SubDirs[fileInfo.Name] = fileInfo
		} else {
			dirCnt.Files[fileInfo.Name] = fileInfo
		}
	}
	dirCnt.LastIndex = time.Now()
	dirCnt.Size = dirCnt.getSize()
	return nil
}

func (dirCnt *DirContent) RenameItem(path, parentPath, newName string) error {
	sysInfo = GetSysInfoInstance()
	if err := os.Rename(path, filepath.Join(parentPath, newName, utils.SEGMENT)); err != nil {
		return err
	}
	//// 修改后端保存的信息
	//if item, exist := dirCnt.SubDirs[curName]; exist {
	//	item.Name = newName
	//	item.IsModified = true
	//	delete(dirCnt.SubDirs, curName)
	//	dirCnt.SubDirs[newName] = item
	//}
	//if item, exist := dirCnt.Files[curName]; exist {
	//	item.Name = newName
	//	item.IsModified = true
	//	delete(dirCnt.Files, curName)
	//	dirCnt.Files[newName] = item
	//}
	//dirCnt.IsModified = true
	return nil
}

func (dirCnt *DirContent) DeleteItem(path string) error {
	err := os.Remove(path)
	if err != nil {
		log.Println(err)
		strs := strings.Split(err.Error(), ":")
		return fmt.Errorf(strs[len(strs)-1])
	}
	return nil
}

func (dirCnt *DirContent) getSize() uint64 {
	var (
		size     uint64
		fileSize uint64
	)
	if len(dirCnt.Path) > 0 {
		size += uint64(len(dirCnt.Path)) * uint64(unsafe.Sizeof(dirCnt.Path[0]))
	}
	size += uint64(unsafe.Sizeof(dirCnt.Error))
	if len(dirCnt.Files) > 0 {
		for _, v := range dirCnt.Files {
			fileSize = v.getSize()
			break
		}
	} else if len(dirCnt.SubDirs) > 0 {
		for _, v := range dirCnt.SubDirs {
			fileSize = v.getSize()
			break
		}
	}
	size += uint64(len(dirCnt.Files)+len(dirCnt.SubDirs)) * fileSize
	return size
}

func (entry *FileSystemEntry) getSize() uint64 {
	var (
		size uint64
	)
	if len(entry.Path) > 0 {
		size += uint64(len(entry.Path)) * uint64(unsafe.Sizeof(entry.Path[0]))
	}
	if len(entry.Name) > 0 {
		size += uint64(len(entry.Name)) * uint64(unsafe.Sizeof(entry.Name[0]))
	}
	size += uint64(unsafe.Sizeof(entry.IsDir) + unsafe.Sizeof(entry.Size) + unsafe.Sizeof(entry.ModTime) + unsafe.Sizeof(entry.Mode))
	return size
}
