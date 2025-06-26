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
)

func GoSearchRun(assets embed.FS, port int, icon []byte) {

	var (
		err error
	)
	api := NewAPI()
	dirController := NewDirController()
	fileController := NewFileController()

	app := application.NewWithOptions(&options.App{
		Title: "GoSearch",
		//Width:  1024,
		//Height: 768,
		MinWidth:  720,  // 可选：最小宽度
		MinHeight: 500,  // 可选：最小高度
		Width:     1280, // 可选：最大宽度
		Height:    800,  // 可选：最大高度
		Frameless: true, // <--- 关键：设置为 true 实现无边框
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup: func(ctx context.Context) {
			api.setCtx(ctx)
			dirController.setCtx(ctx)
			//fileController.setCtx(ctx)
		},
		OnShutdown: func(ctx context.Context) {
			api.CloseResource()
			dirController.pathCache.StopJanitor()
		},
		Bind: []interface{}{
			api,
			dirController,
			fileController,
		},
		Mac: &mac.Options{
			TitleBar:   mac.TitleBarDefault(),
			Appearance: mac.NSAppearanceNameDarkAqua,
			About: &mac.AboutInfo{
				Title:   "GoSearch",
				Message: "© 2023 Your Name or Company",
				Icon:    icon,
			},
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
		},
		Windows: &windows.Options{
			WebviewIsTransparent:              false,
			WindowIsTranslucent:               false,
			DisableFramelessWindowDecorations: false,
			Theme:                             windows.SystemDefault, // 跟随系统主题
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
