package main

import (
	"GoSearch/app/controller"
	"embed"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed all:appicon.png
var icon []byte

func main() {
	controller.GoSearchRun(assets, 3001, icon)
}
