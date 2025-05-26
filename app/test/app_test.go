package test

import (
	"GoSearch/app/service"
	"encoding/json"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"testing"
	"time"
)

func TestGetUserDir(t *testing.T) {
	err := service.InitializeConfig()
	if err != nil {
		t.Error(err)
	}
	t.Log(service.AppConf)

	err = service.ChangeBootConfig("E:\\Tools")
	if err != nil {
		t.Error(err)
	}
	t.Log(service.BootConf)
}

func TestSetAppConfig(t *testing.T) {
	newConf := &service.AppConfig{
		AppName:       "GoSearch",
		AppVersion:    "1.1.1",
		CustomDataDir: "E:\\Tools\\SetUp",
		Language:      "en",
		Theme:         "light",
	}
	err := service.InitializeConfig()
	if err != nil {
		t.Error(err)
	}
	t.Log(service.BootConf)
	t.Log(service.AppConf)
	if err = service.SetAppConfig(newConf); err != nil {
		t.Log(err)
		return
	}
	t.Log(service.AppConf)
	if err = service.AppConf.ChangeAppConfig(); err != nil {
		t.Log(err)
		return
	}
	t.Log("Changed Successfully!")
}

func TestOS(t *testing.T) {
	// 获取1000ms内的CPU信息，太短不准确，也可以获几秒内的，但这样会有延时，因为要等待
	cc, _ := cpu.Percent(time.Millisecond*3000, true)
	t.Log(cc)
	cc, _ = cpu.Percent(time.Millisecond*3000, false)
	t.Log(cc)
}

func TestDisk(t *testing.T) {
	infos, _ := disk.Partitions(false)
	for _, info := range infos {
		useStat, _ := disk.Usage(info.Device)
		data, _ := json.MarshalIndent(useStat, "", " ")
		t.Log(string(data))
	}
}
