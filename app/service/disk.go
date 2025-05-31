package service

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
