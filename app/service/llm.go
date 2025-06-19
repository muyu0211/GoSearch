package service

import (
	"GoSearch/app/utils"
	"context"
	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
	"log"
	"strings"
	"sync"
	"time"
)

var (
	llm     *openai.LLM
	temp    = 0.6
	llmOnce sync.Once
)

type Request struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// EnsureInitialLLM 确保大模型对象被初始化
func EnsureInitialLLM() error {
	var err error = nil
	llmOnce.Do(func() {
		if userData == nil {
			if userData, err = GetUserData(); err != nil || userData == nil {
				return
			}
		}
	})
	err = loadLLM(userData)
	return err
}

// LoadLLM 初始化大模型
func loadLLM(conf *UData) error {
	var (
		err error
	)
	if llm, err = openai.New(
		openai.WithModel(conf.Model),
		openai.WithBaseURL(conf.BaseURL),
		openai.WithToken(conf.ApiKey),
	); err != nil {
		log.Printf("初始化大语言模型失败: %v\n", err)
		return err
	}
	return nil
}

// ParseParamsFromLLM 从用户查询中解析出结构化查询条件
func ParseParamsFromLLM(query string) (*SearchParams, error) {
	var (
		ctx      = context.Background()
		response *llms.ContentResponse
		err      error
	)

	if err = EnsureInitialLLM(); err != nil {
		return nil, err
	}

	var content []llms.MessageContent

	start := time.Now()
	content = append(content, llms.TextParts(llms.ChatMessageTypeSystem, utils.SystemPrompt))
	content = append(content, llms.TextParts(llms.ChatMessageTypeHuman, query))

	if response, err = llm.GenerateContent(ctx, content, llms.WithTemperature(temp)); err != nil {
		log.Println("模型输出失败:", err)
		return nil, err
	}
	log.Println(response.Choices[0].Content)
	log.Println("耗时：", time.Since(start))

	searchParams := &SearchParams{}
	if err = utils.UnmarshalJSON(response.Choices[0].Content, searchParams); err != nil {
		return nil, err
	}
	return searchParams, nil
}

// TestLLM 测试大模型是否可用
func TestLLM() string {
	if err := EnsureInitialLLM(); err != nil {
		if strings.Contains(err.Error(), "missing the OpenAI API key") {
			log.Println("missing the OpenAI API key")
			return "missing the OpenAI API key"
		} else {
			return err.Error()
		}
	}
	var (
		ctx      = context.Background()
		response *llms.ContentResponse
		err      error
	)
	var content []llms.MessageContent
	content = append(content, llms.TextParts(llms.ChatMessageTypeSystem, "你是一个嵌入至由Go404工作室开发的GoSearch文件检索桌面应用的智能文件搜索助手"))
	content = append(content, llms.TextParts(llms.ChatMessageTypeHuman, "你好, 你是谁"))
	if response, err = llm.GenerateContent(ctx, content, llms.WithTemperature(temp)); err != nil {
		log.Println("模型输出失败:", err)
		return err.Error()
	}
	return response.Choices[0].Content
}
