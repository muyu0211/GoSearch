export namespace controller {
	
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

