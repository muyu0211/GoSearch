package service

import (
	"GoSearch/app/utils"
	"context"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type SearchTask struct {
	currPath string
	params   *SearchParams
}

func NewTask(currPath string, params *SearchParams) SearchTask {
	return SearchTask{
		currPath: currPath,
		params:   params,
	}
}

type SearchPool struct {
	workers int                   // 协程池中协程的数量
	tasks   chan SearchTask       // 任务队列
	results chan *FileSystemEntry // 结果收集
	wg      sync.WaitGroup        // 等待所有协程完成
	ctx     context.Context       // 用于取消操作
	cancel  context.CancelFunc
}

func NewSearchPool(workers int) *SearchPool {
	ctx, cancel := context.WithCancel(context.Background())
	return &SearchPool{
		workers: workers,
		tasks:   make(chan SearchTask, 1000),
		results: make(chan *FileSystemEntry),
		ctx:     ctx,
		cancel:  cancel,
	}
}

// Start 启动协程池
func (p *SearchPool) Start(params *SearchParams) {
	// 启动目录生成协程, 生成搜索目录
	go p.Schedule(params)

	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go func() {
			defer p.wg.Done()
			for {
				select {
				case task, ok := <-p.tasks:
					if !ok {
						return
					}
					task.Run(p.results)
				case <-p.ctx.Done():
					return
				}
			}
		}()
	}

	// 等待所有协程完成
	go p.WaitAndStop()
}

// Schedule 用于生成搜索目录
func (p *SearchPool) Schedule(params *SearchParams) {
	// 结束时关闭任务队列
	defer close(p.tasks)

	err := filepath.WalkDir(params.BaseDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		select {
		case <-p.ctx.Done():
			return p.ctx.Err()
		default:
			if d.IsDir() {
				p.tasks <- NewTask(path, params)
			}
		}
		return nil
	})
	if err != nil {
		log.Printf("Schedule error:%v", err)
	}
}

func (p *SearchPool) WaitAndStop() {
	p.wg.Wait()
	// 释放资源
	close(p.results)
}

// Run 进行item检索
func (t *SearchTask) Run(results chan *FileSystemEntry) {
	entries, err := os.ReadDir(t.currPath)
	if err != nil {
		return
	}
	for _, entry := range entries {
		entryInfo, err := entry.Info()
		if err != nil {
			continue
		}

		fileModTime := entryInfo.ModTime().Unix()
		entryName := entryInfo.Name()

		// 首先进行通配符匹配
		if t.params.GlobPattern != "" {
			matched, err := filepath.Match(t.params.GlobPattern, entryName)
			if err != nil || !matched {
				continue
			}
		}

		// 对文件名进行匹配（前缀匹配）
		if t.params.TargetName != "" {
			if !strings.HasPrefix(entryName, t.params.TargetName) {
				continue
			}
		}

		// 对类型进行匹配
		if len(t.params.FileType) > 0 {
			extIndex := strings.LastIndex(entryName, ".")
			if extIndex != -1 {
				entryType := entryName[strings.LastIndex(entryName, ".")+1:]
				flag := false
				for _, typ := range t.params.FileType {
					if entryType == typ {
						flag = true
					}
				}
				if !flag {
					continue
				}
			} else {
				continue
			}
		}

		// 对大小进行匹配
		if t.params.MinSize != 0 || t.params.MaxSize != 0 {
			if entry.IsDir() { // 不匹配文件夹
				continue
			}
			size := uint64(entryInfo.Size())
			if t.params.MinSize > 0 && size < t.params.MinSize {
				continue
			}
			if t.params.MaxSize > 0 && size > t.params.MaxSize {
				continue
			}
		}

		// 对日期进行匹配
		if t.params.ModifiedBefore != nil {
			if fileModTime < t.params.ModifiedBefore.Unix() {
				continue
			}
		}
		if t.params.ModifiedAfter != nil {
			if fileModTime > t.params.ModifiedAfter.Unix() {
				continue
			}
		}

		// 都满足则匹配成功
		results <- &FileSystemEntry{
			Path:    utils.Join(t.currPath, entryName),
			Name:    entryName,
			IsDir:   entry.IsDir(),
			Size:    entryInfo.Size(),
			ModTime: entryInfo.ModTime(),
			Mode:    entryInfo.Mode(),
		}
	}
}

func (p *SearchPool) Results() ([]*FileSystemEntry, error) {
	res := make([]*FileSystemEntry, 0)
	for entry := range p.results {
		res = append(res, entry)
	}
	// 处理搜索结果
	//for result := range p.results {
	//	log.Printf("找到: %s (大小: %d bytes, 类型: %s)\n", result.Path, result.Size, result.IsDir)
	//}
	return res, nil
}

// Cancel 取消搜索
func (p *SearchPool) Cancel() {
	p.cancel()
}
