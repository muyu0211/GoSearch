package utils

import (
	"runtime"
	"sync/atomic"
)

type locker interface {
	Lock()
	Unlock()
}

// SpinLock 自旋锁
type SpinLock struct {
	state uint32 // 0: 未锁定; 1: 已锁定
}

func (sl *SpinLock) Lock() {
	for {
		// 未获取到锁则先让出时间片
		if !atomic.CompareAndSwapUint32(&sl.state, 0, 1) {
			runtime.Gosched()
		}
	}
}

func (sl *SpinLock) Unlock() {
	atomic.StoreUint32(&sl.state, 0)
}
