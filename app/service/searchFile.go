package service

import (
	"GoSearch/app/utils"
	"errors"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

type SearchParams struct {
	BaseDir        string // 要搜索的基础目录
	SearchTerm     string // 原始或处理后的搜索词 (用于文件名/内容匹配)
	TargetName     string // 如果明确是搜特定名称
	IsFile         bool   // 标记是否明确搜索文件
	IsDir          bool   // 标记是否明确搜索目录
	GlobPattern    string // 通配符模式
	FileType       map[string]struct{}
	MinSize        uint64
	MaxSize        uint64
	ModifiedAfter  *time.Time
	ModifiedBefore *time.Time
	SearchContent  bool // 是否搜索文件内容 (如果支持) Recursive bool // 是否递归搜索子目录 (通常默认为 true)
}

// SearchItems 并发搜索文件
func SearchItems(searchParams *SearchParams) ([]*FileSystemEntry, error) {
	var (
		result     []*FileSystemEntry
		searchPool *SearchPool
		err        error
	)

	searchPool = NewSearchPool(16)
	searchPool.Start(searchParams) // 启动搜索

	if result, err = searchPool.Results(); err != nil {
		return nil, err
	}

	return result, nil
}

// ParseParams 解析用户搜索参数
func ParseParams(input, currDirPath string) (*SearchParams, error) {
	searchParams := &SearchParams{
		BaseDir:    currDirPath,
		SearchTerm: strings.ToLower(input), // 忽略大小写
		FileType:   make(map[string]struct{}),
		MinSize:    0,
		MaxSize:    0,
	}
	// 用户可进行的输入
	// 1. type: [item类型]
	// 2. size: [xxKB(kb) xxMB(mb)]
	// 3. glob: 通配符模式
	// 4. 不包含以上特判字符串时, 认为用户输入的为item名字

	// 定义条件模式
	patterns := []struct {
		Name    string
		Pattern *regexp.Regexp
		Handler func(*SearchParams, []string) error
	}{
		{
			Name:    "name",
			Pattern: regexp.MustCompile(`name:\s*(\S+)`),
			Handler: handleNameFilter,
		},
		{
			Name:    "type",
			Pattern: regexp.MustCompile(`type:\s*([a-zA-Z0-9._-]+(?:\s*[,\s]\s*[a-zA-Z0-9._-]+)*)`),
			Handler: handleTypeFilter,
		},
		{
			Name:    "size",
			Pattern: regexp.MustCompile(`size:\s*((?:[<>=]+\d+(?:\.\d+)?[BKMGTbkmgt]?\s*)+)`),
			Handler: handleSizeFilter,
		},
		{
			Name:    "glob",
			Pattern: regexp.MustCompile(`glob:\s*(\S+)`),
			Handler: handleGlobFilter,
		},
	}

	isPattern := false
	for _, p := range patterns {
		matches := p.Pattern.FindAllStringSubmatch(input, -1)
		for _, match := range matches {
			isPattern = true
			if err := p.Handler(searchParams, match); err != nil {
				log.Printf("Parse %s error", p.Name)
			}
			input = strings.Replace(input, match[0], "", 1)
		}
	}
	// 如果没有关键字，则认为整个字符串为目标名称
	if !isPattern {
		searchParams.TargetName = input
	}

	return searchParams, nil
}

// 处理文件名称过滤
func handleNameFilter(params *SearchParams, match []string) error {
	// 提取匹配的文件名模式
	namePattern := match[1]
	params.TargetName = namePattern
	return nil
}

// 处理文件类型过滤
func handleTypeFilter(params *SearchParams, match []string) error {
	typeStr := match[1]
	// 使用逗号或者空白符进行分割
	types := strings.FieldsFunc(typeStr, func(r rune) bool {
		return r == ',' || unicode.IsSpace(r)
	})
	for _, t := range types {
		t = strings.TrimLeft(t, ".") // 去除首位的.
		params.FileType[strings.TrimSpace(strings.ToLower(t))] = struct{}{}
	}
	return nil
}

// 处理文件大小过滤
func handleSizeFilter(params *SearchParams, match []string) error {
	sizeStr := match[0][5:]
	conditions := strings.Fields(sizeStr)
	multipliers := map[string]uint64{"B": 1, "K": utils.KB, "M": utils.MB, "G": utils.GB, "T": utils.TB}

	for _, cond := range conditions {
		// 匹配操作符、数值和单位
		re := regexp.MustCompile(`^([<>=]+)(\d+(?:\.\d+)?)([BKMGTbkmgt]?)$`)
		parts := re.FindStringSubmatch(cond)
		if len(parts) != 4 {
			return fmt.Errorf("无效的大小条件: %s", cond)
		}
		operator := parts[1]
		valueStr := parts[2]
		unit := strings.ToUpper(parts[3])

		// 验证操作符
		if operator != ">" && operator != "<" && operator != ">=" && operator != "<=" && operator != "=" {
			return fmt.Errorf("invalid operator: %s", operator)
		}

		// 解析大小值
		value, err := strconv.ParseFloat(valueStr, 64)
		if err != nil {
			return fmt.Errorf("invalid size: %s", valueStr)
		}

		// 验证单位
		if unit != "" && unit != "B" && unit != "K" && unit != "M" && unit != "G" && unit != "T" {
			return fmt.Errorf("invalid unit: %s", unit)
		}

		// 设置默认单位为字节
		if unit == "" {
			unit = "B"
		}
		size := uint64(value * float64(multipliers[unit]))

		switch operator {
		case ">=":
			params.MinSize = size
		case ">":
			params.MinSize = size + 1
		case "<=":
			params.MaxSize = size
		case "<":
			params.MaxSize = size + 1
		default:
			params.MinSize = size
			params.MaxSize = size
		}
	}

	// check 文件大小范围是否合法
	if !(params.MinSize <= params.MaxSize) {
		return errors.New("invalid Size")
	}
	return nil
}

// TODO: 处理通配符过滤
func handleGlobFilter(params *SearchParams, match []string) error {
	params.GlobPattern = match[1]
	return nil
}
