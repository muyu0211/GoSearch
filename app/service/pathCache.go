package service

import (
	"GoSearch/app/utils"
	"log"
	"sync"
	"time"
)

var (
	pathCacheOnce sync.Once
	ExpiredTime   = 5 * time.Minute // 设置cache30秒过期
	JanitorTime   = 30 * time.Second
	CacheRatio    = 0.3
)

type PathCache struct {
	lock             sync.RWMutex           // Cache的读写锁
	directoryEntries map[string]*DirContent // 当前路径下的内容
	curSize          uint64                 // Cache的当前容量, 以B为单位
	maxSize          uint64                 // Cache的最大容量, 以B为单位
	head, tail       *DirContent            // 使用LRU算法进行淘汰更新：定义头尾结点
	cnt              int                    // 命中次数
	janitorInterval  time.Duration          // 清理协程的运行间隔
	janitorOnce      sync.Once              // 确保清理协程只启动一次
	janitorStopChan  chan struct{}
}

// GetPathCache 获取Cache单例对象
func GetPathCache() *PathCache {
	pathCache := &PathCache{}
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
			pathCache.maxSize = utils.MB * 1
		case sysMem > 4*utils.GB && sysMem <= 8*utils.GB:
			pathCache.maxSize = utils.MB * 2
		case sysMem >= 8*utils.GB:
			pathCache.maxSize = utils.MB * 5
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

		// 初始化轮询协程信息
		pathCache.janitorInterval = JanitorTime
		pathCache.janitorStopChan = make(chan struct{})

		// 启动轮询检查线程
		pathCache.startJanitor()
	})
	return pathCache
}

func (cache *PathCache) Put(dirCnt *DirContent) error {
	// 当键值过大(超过cache容量30%时不放入cache)
	if cache.maxSize > 0 && float64(dirCnt.Size) > float64(cache.maxSize)*CacheRatio {
		return nil
	}

	cache.lock.Lock()
	defer cache.lock.Unlock()

	// cache容量不足进行淘汰
	if cache.curSize >= cache.maxSize || cache.curSize+dirCnt.Size > cache.maxSize {
		tail := cache.tail.pre
		cache.removeNode(tail)
	}
	// 放入cache, 同时设置过期时间
	dirCnt.ExpiredTime = time.Now().Add(ExpiredTime)
	cache.addNodeToHead(dirCnt)
	log.Println("Cache 未命中")
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
	// 命中时判断键是否过期, 如果过期则移除该键
	if time.Now().After(dirContent.ExpiredTime) {
		cache.removeNode(dirContent)
		return nil, false
	}
	cache.moveToHead(dirContent)
	cache.cnt++
	return dirContent, true
}

func (cache *PathCache) Remove(dirPath string) *DirContent {
	var (
		dirCnt = NewDirContent()
		exist  bool
	)
	if dirCnt, exist = cache.directoryEntries[dirPath]; exist {
		cache.removeNode(dirCnt)
	}
	return dirCnt
}

func (cache *PathCache) startJanitor() {
	cache.janitorOnce.Do(func() {
		log.Println("PathCache: Starting janitor goroutine...")
		go cache.runJanitor()
	})
}

func (cache *PathCache) StopJanitor() {
	select {
	case <-cache.janitorStopChan: // 防止再次调用造成关闭已经关闭的通道
		log.Println("PathCache: Janitor already stopped or stop signal sent.")
		return
	default:
		log.Println("PathCache: Janitor stop signal sent.")
		close(cache.janitorStopChan)
	}
}

func (cache *PathCache) runJanitor() {
	ticker := time.NewTicker(JanitorTime)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			cache.evictExpired()
		case <-cache.janitorStopChan:
			return
		}
	}
}

// evictExpired 清除过期数据和修改过的脏数据
func (cache *PathCache) evictExpired() {
	cache.lock.Lock()
	defer cache.lock.Unlock()

	// 遍历链表, 从尾部开始检查
	tail := cache.tail.pre
	for tail != cache.head {
		if time.Now().After(tail.ExpiredTime) || tail.IsModified {
			cache.removeNode(tail)
		}
		// 密码的: 忘记修改指针, 一旦开始执行轮询, 就拿着锁不放, 导致访问文件夹/文件就卡住
		// TODO: 优化问题: 如果轮询线程长时间持有锁, 如何优化
		tail = tail.pre
	}
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
