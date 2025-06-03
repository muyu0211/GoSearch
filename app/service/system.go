package service

import (
	"GoSearch/app/utils"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"log"
	"runtime"
	"sync"
	"time"
)

// SystemInfo 获取系统信息
type SystemInfo struct {
	MemAll         uint64  `json:"mem_all"`
	MemFree        uint64  `json:"mem_free"`
	MemUsed        uint64  `json:"mem_used"`
	MemUsedPercent float64 `json:"mem_used_percent"`

	//Days    int64 `json:"days"`
	//Hours   int64 `json:"hours"`
	//Minutes int64 `json:"minutes"`

	CpuUsedPercent float64 `json:"cpu_used_percent"`

	OS       string `json:"os"`        // 操作系统信息
	Arch     string `json:"arch"`      // 架构信息
	CpuCores int    `json:"cpu_cores"` // CPU核心数量
}

var (
	sysInfo      *SystemInfo
	sysInfoOnce  sync.Once
	sysInfoMutex sync.RWMutex // 用于保护 sysInfo 的并发访问
)

// GetSysInfoInstance 获取systemInfo单例对象
func GetSysInfoInstance() *SystemInfo {
	// 初始化单例
	sysInfoOnce.Do(func() {
		sysInfo = &SystemInfo{
			OS:       runtime.GOOS,
			Arch:     runtime.GOARCH,
			CpuCores: runtime.NumCPU(),
		}
		sysInfo.UpdateMemInfo()
		sysInfo.UpdateCpuInfo()
		sysInfo.UpdateGpuInfo()
		if sysInfo.OS == utils.WINDOWS {
			utils.SEGMENT = "\\"
		} else {
			utils.SEGMENT = "/"
		}
	})
	return sysInfo
}

// UpdateMemInfo 获取内存信息
func (sys *SystemInfo) UpdateMemInfo() {
	sysInfoMutex.Lock()
	defer sysInfoMutex.Unlock()
	var (
		v   *mem.VirtualMemoryStat
		err error
	)

	if v, err = mem.VirtualMemory(); err != nil {
		log.Printf("Error getting virtual memory: %v", err)
	}
	sys.MemAll = v.Total
	sys.MemFree = v.Available
	sys.MemUsed = sys.MemAll - sys.MemFree
	if sys.MemAll > 0 {
		sys.MemUsedPercent = float64(sys.MemUsed) / float64(sys.MemAll) * 100.0
	} else {
		sys.MemUsedPercent = 0
	}
}

func (sys *SystemInfo) UpdateCpuInfo() {
	sysInfoMutex.Lock()
	defer sysInfoMutex.Unlock()

	// 获取1000ms内的CPU信息，太短不准确，也可以获几秒内的，但这样会有延时，因为要等待
	cc, err := cpu.Percent(time.Millisecond*1000, false)
	if err != nil {
		log.Printf("Error getting CPU percent: %v", err)
		return
	}
	sys.CpuUsedPercent = cc[0]
}

func (sys *SystemInfo) UpdateGpuInfo() {
	sysInfoMutex.Lock()
	defer sysInfoMutex.Unlock()
	// TODO: Coming soon!
}
