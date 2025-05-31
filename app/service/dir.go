package service

import (
	"GoSearch/app/utils"
	"errors"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
	"unsafe"
)

var (
	pathCache     *PathCache
	pathCacheOnce sync.Once
)

// FileSystemEntry 通用文件/目录条目
type FileSystemEntry struct {
	Path    string      `json:"path"`     // 完整绝对路径
	Name    string      `json:"name"`     // 文件或目录名 (例如 "document.txt", "MyFolder")
	IsDir   bool        `json:"is_dir"`   // 是否为目录
	Size    int64       `json:"size"`     // 文件大小 (字节)，目录通常为 0 或特殊值
	ModTime time.Time   `json:"mod_time"` // 最后修改时间
	Mode    os.FileMode `json:"mode"`     // 文件模式 (权限等)，可能不需要序列化给前端
	// IconType     string      `json:"icon_type"`     // 可选: 前端用于显示图标的类型 ("file", "folder-image", "file-pdf", etc.)
	// SymlinkPath  string      `json:"symlink_path,omitempty"` // 如果是符号链接，指向的实际路径
}

// DirContent 表示一个目录下的内容
type DirContent struct {
	Path      string             `json:"path"`            // 当前文件夹的绝对路径
	Files     []*FileSystemEntry `json:"files"`           // 该目录下的所有文件
	SubDirs   []*FileSystemEntry `json:"sub_dirs"`        // 该目录下的所有子文件夹
	Error     error              `json:"error,omitempty"` // 如果扫描此目录时发生错误
	Size      uint64
	LastIndex time.Time   // 上次索引时间
	next, pre *DirContent // 双向链表
}

type PathCache struct {
	lock             sync.RWMutex           // Cache的读写锁
	directoryEntries map[string]*DirContent // 当前路径下的内容
	curSize          uint64                 // Cache的当前容量, 以B为单位
	maxSize          uint64                 // Cache的最大容量, 以B为单位
	head, tail       *DirContent            // 使用LRU算法进行淘汰更新：定义头尾结点
	cnt              int                    // 命中次数
}

// GetPathCache 获取Cache单例对象
func GetPathCache() *PathCache {
	pathCacheOnce.Do(func() {
		sys := GetSysInfoInstance()
		sysMem := sys.MemAll
		// 根据系统内存来指定Cache大小
		switch {
		case sysMem <= 1*utils.GB:
			log.Printf("系统内存: %v", sysMem)
			log.Printf("Your Device's Mem is too Small.")
			return
		case sysMem > 1*utils.GB && sysMem <= 4*utils.GB:
			pathCache = &PathCache{
				maxSize: utils.MB * 1,
			}
		case sysMem > 4*utils.GB && sysMem <= 8*utils.GB:
			pathCache = &PathCache{
				maxSize: utils.MB * 2,
			}
		case sysMem >= 8*utils.GB:
			pathCache = &PathCache{
				maxSize: utils.MB * 5,
			}
		}
		// 初始化双向链表
		head, tail := NewDirContent(), NewDirContent()
		head.next = tail
		tail.pre = head
		pathCache.head, pathCache.tail = head, tail

		size := head.getSize()
		pathCache.maxSize += size * 2 // 加上首尾结点的大小
		pathCache.curSize = size * 2
		pathCache.directoryEntries = make(map[string]*DirContent)
	})
	return pathCache
}

func NewDirContent() *DirContent {
	return &DirContent{}
}

func (cache *PathCache) Put(dirCnt *DirContent) error {
	cache.lock.Lock()
	defer cache.lock.Unlock()

	if cache.curSize >= cache.maxSize || cache.curSize+dirCnt.Size > cache.maxSize {
		// 容量已满进行淘汰
		tail := cache.tail.pre
		cache.removeNode(tail)
	}
	// 放入cache
	cache.addNodeToHead(dirCnt)
	return nil
}

func (cache *PathCache) Get(dirPath string) (*DirContent, bool) {
	var (
		dirContent *DirContent
		exist      bool
	)
	cache.lock.Lock()
	defer cache.lock.Unlock()
	// 未命中cache, 直接返回
	if dirContent, exist = cache.directoryEntries[dirPath]; !exist {
		return nil, false
	}
	// 命中则将该节点移到头部
	cache.moveToHead(dirContent)
	cache.cnt++
	return dirContent, true
}

func (cache *PathCache) moveToHead(dirCnt *DirContent) {
	cache.removeNode(dirCnt)    // 先将结点移除
	cache.addNodeToHead(dirCnt) // 再将结点添加至链表中
}

func (cache *PathCache) removeNode(dirCnt *DirContent) {
	if dirCnt == nil || dirCnt == cache.head || dirCnt == cache.tail {
		return
	}
	var (
		curNode *DirContent
		ok      bool
	)
	if curNode, ok = cache.directoryEntries[dirCnt.Path]; !ok {
		return
	}
	curNode.pre.next = curNode.next
	curNode.next.pre = curNode.pre

	delete(cache.directoryEntries, dirCnt.Path)
	cache.curSize -= dirCnt.Size
}

func (cache *PathCache) addNodeToHead(dirCnt *DirContent) {
	dirCnt.next = cache.head.next
	dirCnt.pre = cache.head
	cache.head.next.pre = dirCnt
	cache.head.next = dirCnt

	cache.directoryEntries[dirCnt.Path] = dirCnt
	cache.curSize += dirCnt.Size
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
			return err
		}
	}
	defer dir.Close()
	if files, err = dir.Readdir(-1); err != nil {
		log.Printf("Error reading directory: %v", err)
		return err
	}
	dirCnt.Path = dirPath
	dirCnt.Files = make([]*FileSystemEntry, 0)
	dirCnt.SubDirs = make([]*FileSystemEntry, 0)
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
			dirCnt.SubDirs = append(dirCnt.SubDirs, fileInfo)
		} else {
			dirCnt.Files = append(dirCnt.Files, fileInfo)
		}
		//if file.IsDir() {
		//	dirCnt.SubDirs = append(dirCnt.SubDirs, &FileSystemEntry{
		//		Name:  file.Name(),
		//		Path:  filepath.Join(dirPath, utils.SEGMENT, file.Name()),
		//		Mode:  file.Mode(),
		//		IsDir: true,
		//		Size:  0,
		//	})
		//} else {
		//	dirCnt.Files = append(dirCnt.Files, &FileSystemEntry{
		//		Name:    file.Name(),
		//		Path:    filepath.Join(dirPath, utils.SEGMENT, file.Name()),
		//		Mode:    file.Mode(),
		//		IsDir:   false,
		//		Size:    file.Size(),
		//		ModTime: file.ModTime(),
		//	})
		//}
	}
	dirCnt.LastIndex = time.Now()
	dirCnt.Size = dirCnt.getSize()
	return nil
}

func (dirCnt *DirContent) getSize() uint64 {
	// TODO:
	var (
		size     uint64
		fileSize uint64
	)
	if len(dirCnt.Path) > 0 {
		size += uint64(len(dirCnt.Path)) * uint64(unsafe.Sizeof(dirCnt.Path[0]))
	}
	size += uint64(unsafe.Sizeof(dirCnt.Error))
	if len(dirCnt.Files) > 0 {
		fileSize = dirCnt.Files[0].getSize()
	} else if len(dirCnt.SubDirs) > 0 {
		fileSize = dirCnt.SubDirs[0].getSize()
	}
	size += uint64(len(dirCnt.Files)+len(dirCnt.SubDirs)) * fileSize
	return size
}

func (file *FileSystemEntry) getSize() uint64 {
	var (
		size uint64
	)
	if len(file.Path) > 0 {
		size += uint64(len(file.Path)) * uint64(unsafe.Sizeof(file.Path[0]))
	}
	if len(file.Name) > 0 {
		size += uint64(len(file.Name)) * uint64(unsafe.Sizeof(file.Name[0]))
	}
	size += uint64(unsafe.Sizeof(file.IsDir) + unsafe.Sizeof(file.Size) + unsafe.Sizeof(file.ModTime) + unsafe.Sizeof(file.Mode))
	return size
}
