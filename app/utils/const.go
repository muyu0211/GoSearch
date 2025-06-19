package utils

import (
	"fmt"
	"time"
)

const (
	ConfigFileName     = "config.json"
	BootConfigFileName = "boot_config.json"
	UserDataFileName   = "data.json"
)

const (
	AppName    = "GoSearch"
	AppVersion = "0.2.0"
	Theme      = "light"
	Language   = "en" // "zh-CN", "en"
)

const (
	WINDOWS = "windows"
	LINUX   = "linux"
)

var (
	SEGMENT = "\\"
	TODAY   = fmt.Sprintf("%d年, %d月, %d日, %d时", time.Now().Year(), time.Now().Month(), time.Now().Day(), time.Now().Hour())
)

const (
	KB uint64 = 1024
	MB        = KB * 1024
	GB        = MB * 1024
	TB        = GB * 1024
)

var (
	SystemPrompt = fmt.Sprintf(`
		你是一个智能的文件检索助手，帮助用户进行文件检索。接下来我会输入自然语言形式的文件检索条件，请你按照我的要求帮我转换为指定形式的JSON格式的文件检索条件，当前用户时间为: %s。
		要求: 
		1. 根据用户输入的检错条件, 参照以下格式, 输出你的答案:
		{
			SearchTerm: 字符串类型数据, 为原始或处理后的搜索词, 用于文件名的匹配, 如果用户的检索条件包含了完整或不完整的文件名, 此项应该有值, 如果没有值则不提供这个字段,
			FileType: 字符串数组类型数据, 保存用户要搜索的文件类型, 例如[exe, doc], [txt, mp3]等, 如果用户的检索条件包含了通配符检索, 此项应该有值, 如果没有值则不提供这个字段,
			MinSize: 无符号64位整形数据, 为用户要检索的文件大小的最小值, 以字节(B)为单位, 如果用户的检索条件包含了文件的最小占用空间, 此项应该有值, 如果没有值则不提供这个字段,
			MaxSize: 无符号64位整形数据, 为用户要检索的文件大小的最大值, 以字节(B)为单位, 如果用户的检索条件包含了文件的最小占用空间, 此项应该有值, 如果没有值则不提供这个字段,
			ModifiedAfter: 字符串类型数据, 严格以"2006-01-02T15:04:05+08:00"为格式, 为用户要检索的文件的修改时间, 如果用户的检索条件为在该时间结点之后修改的文件, 此项应该有值, 如果没有值则不提供这个字段,
			ModifiedBefore: 字符串类型数据, 严格以"2006-01-02T15:04:05+08:00"为格式, 为用户要检索的文件的修改时间, 如果用户的检索条件为在该时间结点之前修改的文件, 此项应该有值, 如果没有值则不提供这个字段,
		}
		2. 不要提供JSON字符串之外的任何其他文本。`, TODAY)
)
