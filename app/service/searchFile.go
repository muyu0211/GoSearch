package service

import (
	"GoSearch/app/dto"
	"GoSearch/app/utils"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

type SearchParams struct {
	BaseDir        string // 要搜索的基础目录
	Query          string // 原始的搜索词 (用于文件名/内容匹配)
	IsFile         bool   // 标记是否明确搜索文件
	IsDir          bool   // 标记是否明确搜索目录
	FileType       []string
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

	searchPool = NewSearchPool(32)
	searchPool.Start(searchParams)

	if result, err = searchPool.Results(); err != nil {
		return nil, err
	}

	return result, nil
}

func SearchItemsInStream(searchParams *SearchParams) (<-chan *FileSystemEntry, error) {
	var (
		searchPool *SearchPool
	)

	searchPool = NewSearchPool(32)
	searchPool.Start(searchParams)
	return searchPool.results, nil
}

// ParseParams 解析用户搜索参数
func ParseParams(param *dto.SearchParams) (*SearchParams, error) {
	searchParams := &SearchParams{
		Query:    param.Query,
		FileType: param.FileType,
		MinSize:  param.MinSize,
		MaxSize:  param.MaxSize,
	}
	if strings.HasSuffix(param.CurrentPath, ":") {
		searchParams.BaseDir = utils.Join(param.CurrentPath)
	}

	// 解析时间字符串
	if param.ModifiedAfter != "" {
		if modifiedAfter, err := time.Parse(utils.TimeLayOut, param.ModifiedAfter); err == nil {
			searchParams.ModifiedAfter = &modifiedAfter
		}
	}
	if param.ModifiedBefore != "" {
		if modifiedBefore, err := time.Parse(utils.TimeLayOut, param.ModifiedBefore); err == nil {
			searchParams.ModifiedBefore = &modifiedBefore
		}
	}

	// 定义条件模式
	//patterns := []struct {
	//	Name    string
	//	Pattern *regexp.Regexp
	//	Handler func(*SearchParams, []string) error
	//}{
	//	{
	//		Name:    "name",
	//		Pattern: regexp.MustCompile(`name:\s*(\S+)`),
	//		Handler: handleNameFilter,
	//	},
	//	{
	//		Name:    "type",
	//		Pattern: regexp.MustCompile(`type:\s*([a-zA-Z0-9._-]+(?:\s*[,\s]\s*[a-zA-Z0-9._-]+)*)`),
	//		Handler: handleTypeFilter,
	//	},
	//	{
	//		Name:    "size",
	//		Pattern: regexp.MustCompile(`size:\s*((?:[<>=]+\s*\d+(?:\.\d+)?\s*(?:[BKMGT]?[Bb]?[Yy]?[Tt]?[Ee]?[Ss]?)?\s*)+)`),
	//		Handler: handleSizeFilter,
	//	},
	//	{
	//		Name:    "glob",
	//		Pattern: regexp.MustCompile(`glob:\s*(\S+)`),
	//		Handler: handleGlobFilter,
	//	},
	//}
	//
	//isPattern := false
	//for _, p := range patterns {
	//	matches := p.Pattern.FindAllStringSubmatch(input, -1)
	//	for _, match := range matches {
	//		isPattern = true
	//		if err := p.Handler(searchParams, match); err != nil {
	//			log.Printf("Parse %s error", p.Name)
	//			return nil, err
	//		}
	//		input = strings.Replace(input, match[0], "", 1)
	//	}
	//}
	//// 如果没有关键字，则认为整个字符串为目标名称
	//if !isPattern {
	//	searchParams.TargetName = input
	//}

	return searchParams, nil
}

// 处理文件类型过滤
func handleTypeFilter(params *SearchParams, match []string) error {
	typeStr := match[1]
	// 使用逗号或者空白符进行分割
	types := strings.FieldsFunc(typeStr, func(r rune) bool {
		return r == ',' || unicode.IsSpace(r)
	})
	for _, t := range types {
		t = strings.TrimLeft(t, ".") // 去除首位的'.'
		params.FileType = append(params.FileType, strings.TrimSpace(strings.ToLower(t)))
		//params.FileType[strings.TrimSpace(strings.ToLower(t))] = struct{}{}
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
		re := regexp.MustCompile(`^([<>=]+)(\d+(?:\.\d+)?)([BKMGT]?[bB]?)$`)
		parts := re.FindStringSubmatch(strings.ToUpper(cond))
		if len(parts) != 4 {
			return fmt.Errorf("无效的大小条件: %s", cond)
		}
		operator := parts[1]
		valueStr := parts[2]
		unit := parts[3]

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
		u := unit[:1]
		if u != "" && u != "B" && u != "K" && u != "M" && u != "G" && u != "T" {
			return fmt.Errorf("invalid unit: %s", unit)
		}

		size := uint64(value * float64(multipliers[u]))

		switch operator {
		case ">=":
			params.MinSize = size
		case ">":
			params.MinSize = size + 1
		case "<=":
			params.MaxSize = size
		case "<":
			params.MaxSize = size - 1
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
