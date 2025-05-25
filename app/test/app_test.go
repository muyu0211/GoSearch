package test

import (
	"GoSearch/app/controller"
	"testing"
)

func TestGetUserDir(t *testing.T) {
	err := controller.InitializeConfig()
	if err != nil {
		t.Error(err)
	}
	t.Log(controller.AppConf)

	err = controller.ChangeBootConfig("E:\\Tools")
	if err != nil {
		t.Error(err)
	}
	t.Log(controller.BootConf)
}

func TestSetAppConfig(t *testing.T) {
	newConf := &controller.AppConfig{
		AppName:       "GoSearch",
		AppVersion:    "1.1.1",
		CustomDataDir: "E:\\Tools\\SetUp",
		Language:      "en",
		Theme:         "light",
	}
	err := controller.InitializeConfig()
	if err != nil {
		t.Error(err)
	}
	t.Log(controller.BootConf)
	t.Log(controller.AppConf)
	if err = controller.SetAppConfig(newConf); err != nil {
		t.Log(err)
		return
	}
	t.Log(controller.AppConf)
	if err = controller.AppConf.ChangeAppConfig(); err != nil {
		t.Log(err)
		return
	}
	t.Log("Changed Successfully!")
}

func TestOS(t *testing.T) {
	controller.Sys.UpdateMemInfo()
	t.Log(controller.Sys)
}
