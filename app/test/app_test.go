package test

import (
	"GoSearch/app/controller"
	"GoSearch/app/service"
	"GoSearch/app/utils"
	"encoding/json"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"math/rand"
	"os"
	"path/filepath"
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
	//cc, _ := cpu.Percent(time.Millisecond*3000, true)
	//t.Log(cc)
	//cc, _ = cpu.Percent(time.Millisecond*3000, false)
	//t.Log(cc)
	v, _ := mem.VirtualMemory()
	t.Log(v.Total)
}

func TestDisk(t *testing.T) {
	infos, _ := disk.Partitions(false)
	for _, info := range infos {
		useStat, _ := disk.Usage(info.Device)
		data, _ := json.MarshalIndent(useStat, "", " ")
		t.Log(string(data))
	}
}

// --- 全局变量或在测试设置中初始化的变量 ---
var (
	// allRealDirectoryPaths 应该在测试开始前被填充
	// 例如，通过读取一个文件，或者扫描一个大的根目录来获取
	allRealDirectoryPaths  []string
	numBenchmarkPaths      = 100000 // 我们要进行10万次索引操作
	generatedRandomIndices []int    // 存储生成的随机索引
)

// setupBenchmarkData 负责填充 allRealDirectoryPaths 和生成随机索引
func setupBenchmarkData(tb testing.TB) {
	if len(allRealDirectoryPaths) == 0 {
		tb.Log("Setting up benchmark data: Populating allRealDirectoryPaths...")
		// 【请务必替换为你的真实路径或有效的填充逻辑】
		allRealDirectoryPaths = []string{
			"D:",
			"C:\\Windows",
			"C:\\Program Files",
			"D:\\Kits\\IDE\\GoCode\\workspace\\GoSearch\\build\\bin",
			"D:\\Kits\\IDE\\GoCode\\workspace\\GoSearch\\build\\windows",
			"D:\\Kits\\IDE\\CPP",
			"D:\\Kits\\IDE\\FinalShell",
			"D:\\Kits\\IDE\\FinalShell\\img",
			"D:\\Kits\\IDE\\FinalShell\\sync",
			"D:\\Overwatch",
			"E:",
			"E:\\Files",
			"E:\\Images\\Photos",
			"E:\\Images\\Photos\\GamePhotos",
			"E:\\Images\\Photos\\风光",
			"E:\\Images\\Photos\\风光\\香港人像",
			"E:\\Need for Speed Heat",
			"E:\\Need for Speed Heat\\downloadedData",
			"E:\\Need for Speed Heat\\downloadedData\\screenshot",
			"C:",
			"C:\\Users\\muyu",
			"C:\\Users\\muyu\\AppData",
			"C:\\Users\\muyu\\AppData\\Roaming",
			"C:\\Users\\muyu\\AppData\\Roaming\\tidalab",
		}
		// ---------------------------------------------------------------------

		if len(allRealDirectoryPaths) == 0 {
			tb.Fatal("allRealDirectoryPaths is empty. Please provide real directory paths for benchmarking.")
		}
		tb.Logf("Loaded %d real directory paths for benchmark.", len(allRealDirectoryPaths))
	}

	if len(generatedRandomIndices) != numBenchmarkPaths {
		tb.Logf("Generating %d random indices...", numBenchmarkPaths)
		r := rand.New(rand.NewSource(time.Now().UnixNano()))
		generatedRandomIndices = make([]int, numBenchmarkPaths)
		for i := 0; i < numBenchmarkPaths; i++ {
			generatedRandomIndices[i] = r.Intn(len(allRealDirectoryPaths))
		}
		tb.Log("Random indices generated.")
	}
}

// cache:20MB, 命中率:99.9% => 1009772400 ns/op  约等于 1.009 s/op
// cache:1KB, 命中率：20.5% => 24043536100 ns/op 约等于 24.05 s/op
// cache:5KB, 命中率：45.2% => 17077484400 ns/op 约等于 17.05 s/op
func BenchmarkDir(b *testing.B) {
	setupBenchmarkData(b)
	b.N = 3
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		dirController := controller.NewDirController()
		for _, idx := range generatedRandomIndices {
			dirController.IndexDir(allRealDirectoryPaths[idx], false)
		}
		//b.Log("命中率: ", float64(dirController.GetHitCnt())/100000.0)
	}
	b.StopTimer() // 暂停计时器，准备索引操作
}

// 27920599800 ns/op ≈ 27.9 s/op
func BenchmarkDirWoCache(b *testing.B) {
	setupBenchmarkData(b)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		dirCnt := &service.DirContent{}
		for _, idx := range generatedRandomIndices {
			dirCnt.GetDirCnt(allRealDirectoryPaths[idx])
		}
	}
	b.StopTimer() // 暂停计时器，准备索引操作
}

func TestIndexFile(t *testing.T) {
	dirController := controller.NewDirController()
	t.Log(dirController.IndexFile("D:\\Kits\\IDE\\GoCode\\workspace\\GoSearch\\build\\bin"))

	t.Log(dirController.IndexFile("D:\\Kits\\IDE\\GoCode\\workspace\\GoSearch\\build\\bin\\GoSearch.exe"))
}

func TestParseParams(t *testing.T) {
	//input := "size: >1k <=10m type: txt .doc .xlsx name: myWord"
	input := "myWord"
	currPath := "E:"
	params, err := service.ParseParams(input, currPath)
	if err != nil {
		t.Log(err)
		return
	}
	t.Log(params)
}

func TestDirWalk(t *testing.T) {
	start := time.Now()
	BaseDir := "D:\\"
	//BaseDir := "E:\\Tools\\SetUp"
	cnt := 0

	filepath.WalkDir(BaseDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			cnt++
		}
		return nil
	})
	t.Logf("WalkDir遍历%d个文件夹, 耗时: %v", cnt, time.Since(start))

	start = time.Now()
	cnt = 0
	filepath.Walk(BaseDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			cnt++
		}
		return nil
	})
	t.Logf("Walk遍历%d个文件夹, 耗时: %v", cnt, time.Since(start))
}

func TestSearchFile(t *testing.T) {
	var (
		//targetInput = "2025"
		//currDirPath = "E:"
		targetInput = "Kits"
		currDirPath = "D:"
		err         error
	)

	dirController := controller.NewDirController()
	response, err := dirController.SearchItemFromInput(targetInput, currDirPath)
	if err != nil {
		return
	}
	for _, res := range response.Items {
		t.Logf("找到: %s (大小: %d bytes, 类型: %v)\n", res.Path, res.Size, res.IsDir)
	}
	t.Logf("文件个数: %d, 耗时: %v s", len(response.Items), float64(response.DurationNs)/1e9)
}

func Test(t *testing.T) {
	t.Log(utils.Join("C:", "bb\\cc.txt"))
}
