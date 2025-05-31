export namespace service {
	
	export class AppConfig {
	    app_name: string;
	    app_version: string;
	    theme: string;
	    language: string;
	    custom_data_dir: string;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.app_name = source["app_name"];
	        this.app_version = source["app_version"];
	        this.theme = source["theme"];
	        this.language = source["language"];
	        this.custom_data_dir = source["custom_data_dir"];
	    }
	}
	export class BootAppConfig {
	    custom_config_dir: string;
	
	    static createFrom(source: any = {}) {
	        return new BootAppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.custom_config_dir = source["custom_config_dir"];
	    }
	}
	export class FileSystemEntry {
	    path: string;
	    name: string;
	    is_dir: boolean;
	    size: number;
	    // Go type: time
	    mod_time: any;
	    mode: number;
	
	    static createFrom(source: any = {}) {
	        return new FileSystemEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.is_dir = source["is_dir"];
	        this.size = source["size"];
	        this.mod_time = this.convertValues(source["mod_time"], null);
	        this.mode = source["mode"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DirContent {
	    path: string;
	    files: FileSystemEntry[];
	    sub_dirs: FileSystemEntry[];
	    error?: any;
	    Size: number;
	    // Go type: time
	    LastIndex: any;
	
	    static createFrom(source: any = {}) {
	        return new DirContent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.files = this.convertValues(source["files"], FileSystemEntry);
	        this.sub_dirs = this.convertValues(source["sub_dirs"], FileSystemEntry);
	        this.error = source["error"];
	        this.Size = source["Size"];
	        this.LastIndex = this.convertValues(source["LastIndex"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Disk {
	    device: string;
	    mount_point: string;
	    file_sys_type: string;
	    total: number;
	    free: number;
	    used: number;
	    used_percent: number;
	
	    static createFrom(source: any = {}) {
	        return new Disk(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.device = source["device"];
	        this.mount_point = source["mount_point"];
	        this.file_sys_type = source["file_sys_type"];
	        this.total = source["total"];
	        this.free = source["free"];
	        this.used = source["used"];
	        this.used_percent = source["used_percent"];
	    }
	}
	
	export class SystemInfo {
	    mem_all: number;
	    mem_free: number;
	    mem_used: number;
	    mem_used_percent: number;
	    cpu_used_percent: number;
	    os: string;
	    arch: string;
	    cpu_cores: number;
	
	    static createFrom(source: any = {}) {
	        return new SystemInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mem_all = source["mem_all"];
	        this.mem_free = source["mem_free"];
	        this.mem_used = source["mem_used"];
	        this.mem_used_percent = source["mem_used_percent"];
	        this.cpu_used_percent = source["cpu_used_percent"];
	        this.os = source["os"];
	        this.arch = source["arch"];
	        this.cpu_cores = source["cpu_cores"];
	    }
	}

}

