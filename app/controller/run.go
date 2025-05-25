package controller

import (
	"context"
	"embed"
	"fmt"
	"github.com/wailsapp/wails/v2/pkg/application"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"log"
)

func GoSearchRun(assets embed.FS, port int, icon []byte) {
	var (
		err error
	)
	// 使用引导配置文件进行app启动
	if err = EnsureInitialized(); err != nil {
		fmt.Println("Get AppConfig Error:", err)
		return
	}

	dirController := NewDirController()
	api := NewAPI()

	app := application.NewWithOptions(&options.App{
		Title:  "GoSearch",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Frameless:        false,
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup: func(ctx context.Context) {
			api.setCtx(ctx)
			dirController.setCtx(ctx)
		},
		OnShutdown: func(ctx context.Context) {
			if err = AppConf.ChangeAppConfig(); err != nil {
				log.Printf("Shutdown error: %v", err.Error())
			}
			fmt.Println("GoSearch Shutdown!!!")
		},
		Bind: []interface{}{
			api,
			dirController,
		},
		Mac: &mac.Options{
			TitleBar: mac.TitleBarDefault(),
			About: &mac.AboutInfo{
				Title:   "GoSearch",
				Message: "wails2演示程序",
				Icon:    icon,
			},
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
		},
		Windows: &windows.Options{
			WebviewIsTransparent:              false,
			WindowIsTranslucent:               false,
			DisableFramelessWindowDecorations: true,
		},
		Linux: &linux.Options{
			ProgramName:         "GoSearch",
			Icon:                icon,
			WebviewGpuPolicy:    linux.WebviewGpuPolicyOnDemand,
			WindowIsTranslucent: false,
		},
	})

	err = app.Run()
	if err != nil {
		fmt.Println("Start Error:", err)
	}
}
