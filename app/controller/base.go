package controller

import (
	"context"
)

// Base 控制器基类
type Base struct {
	ctx context.Context
}

// setCtx 设置上下文对象
func (b *Base) setCtx(ctx context.Context) {
	b.ctx = ctx
}
